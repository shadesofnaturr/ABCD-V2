import dotenv from "dotenv";
import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import multer from "multer";

dotenv.config({ path: ".env.local" });

// Default multer storage buffers the whole upload in memory — on a
// memory-constrained host (e.g. Render's free 512MB tier) that's enough to
// OOM the process on a large order zip. Disk storage streams it instead.
const upload = multer({ dest: os.tmpdir() });

// drive.file (not the full drive scope) — only grants access to files this
// app creates, which is all order-zip uploads ever need. Keeps the OAuth
// consent screen at "sensitive" rather than "restricted", so publishing to
// production doesn't require Google's security assessment.
const OAUTH_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI in .env.local");
  }

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  }
  return client;
}

// Best-effort: persists the refresh token to .env.local for local dev, so it
// survives server restarts without re-authorizing. On a host with an
// ephemeral/read-only filesystem (Render, Cloud Run, etc.) this file won't
// exist and the write is skipped — the token still gets set on the running
// process and is shown on the callback page for the admin to copy into that
// host's own env var dashboard, since that's the only place it'll persist there.
function persistRefreshToken(token: string) {
  process.env.GOOGLE_OAUTH_REFRESH_TOKEN = token;
  const envPath = ".env.local";
  try {
    const existing = fs.readFileSync(envPath, "utf-8");
    const line = `GOOGLE_OAUTH_REFRESH_TOKEN=${token}`;
    const updated = /^GOOGLE_OAUTH_REFRESH_TOKEN=.*$/m.test(existing)
      ? existing.replace(/^GOOGLE_OAUTH_REFRESH_TOKEN=.*$/m, line)
      : `${existing.trimEnd()}\n${line}\n`;
    fs.writeFileSync(envPath, updated);
  } catch {
    // No writable .env.local here — fine, the caller shows the token instead.
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json());

  const getGoogleAuth = () => {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      throw new Error("Missing Google Service Account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY) in .env");
    }

    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });
  };

  // Drive API proxy wrapper
  async function proxyDriveMethod(method: Function, args: any, res: express.Response) {
    try {
      const auth = getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });
      const response = await method.bind(drive.files)(args);
      res.json(response.data);
    } catch (error: any) {
      console.error('Drive API Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  async function proxySheetsMethod(method: Function, args: any, res: express.Response) {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await method.bind(sheets.spreadsheets)(args);
      res.json(response.data);
    } catch (error: any) {
      console.error('Sheets API Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // --- DRIVE ROUTES ---
  app.get("/api/drive/files", (req, res) => {
    return proxyDriveMethod(google.drive({ version: 'v3' }).files.list, {
      q: req.query.q as string,
      fields: req.query.fields as string,
      orderBy: req.query.orderBy as string,
    }, res);
  });

  app.post("/api/drive/files", (req, res) => {
    return proxyDriveMethod(google.drive({ version: 'v3' }).files.create, {
      fields: req.query.fields as string,
      requestBody: {
        name: req.body.name,
        mimeType: req.body.mimeType,
        parents: req.body.parents,
      }
    }, res);
  });

  app.post("/api/drive/files/:fileId/copy", (req, res) => {
    return proxyDriveMethod(google.drive({ version: 'v3' }).files.copy, {
      fileId: req.params.fileId,
      fields: req.query.fields as string,
      requestBody: {
        parents: req.body.parents,
      }
    }, res);
  });

  app.patch("/api/drive/files/:fileId", (req, res) => {
    return proxyDriveMethod(google.drive({ version: 'v3' }).files.update, {
      fileId: req.params.fileId,
      fields: req.query.fields as string,
      requestBody: {
        name: req.body.name,
        description: req.body.description,
      }
    }, res);
  });

  app.delete("/api/drive/files/:fileId", async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });
      await drive.files.delete({ fileId: req.params.fileId });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Drive Delete Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive/files/:fileId/download", async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });
      const response = await drive.files.get(
        { fileId: req.params.fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      response.data.pipe(res);
    } catch (error: any) {
      console.error('Drive Download Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/drive/upload", upload.single('file'), async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const drive = google.drive({ version: 'v3', auth });
      
      const metadata = JSON.parse(req.body.metadata);
      const file = req.file;

      if (!file) throw new Error("No file uploaded");

      const response = await drive.files.create({
        requestBody: {
          name: metadata.name,
          parents: metadata.parents,
        },
        media: {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path),
        },
        fields: 'id,name,thumbnailLink,webViewLink,description',
      });

      res.json(response.data);
    } catch (error: any) {
      console.error('Drive Upload Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      if (req.file) fs.unlink(req.file.path, () => {});
    }
  });

  // --- SHEETS ROUTES ---
  app.post("/api/sheets", async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.create({
        requestBody: req.body
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Sheets Create Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sheets/:sheetId", async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.get({
        spreadsheetId: req.params.sheetId,
        fields: req.query.fields as string,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Sheets Get Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets/:sheetId/batchUpdate", async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: req.params.sheetId,
        requestBody: req.body,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Sheets batchUpdate Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/sheets/:sheetId/values/:range", async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId: req.params.sheetId,
        range: req.params.range,
        valueInputOption: req.query.valueInputOption as string || 'USER_ENTERED',
        requestBody: req.body,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Sheets Update Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sheets/:sheetId/values/:range", async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: req.params.sheetId,
        range: req.params.range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: req.body.values,
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Sheets Append Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sheets/:sheetId/values/:range", async (req, res) => {
    try {
      const auth = getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: req.params.sheetId,
        range: req.params.range,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Sheets Get Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- OAUTH (for Drive writes — the service account has no storage quota) ---
  app.get("/api/oauth/status", (req, res) => {
    res.json({ connected: Boolean(process.env.GOOGLE_OAUTH_REFRESH_TOKEN) });
  });

  app.get("/api/oauth/connect", (req, res) => {
    try {
      const client = getOAuthClient();
      const url = client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: OAUTH_SCOPES,
      });
      res.redirect(url);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/oauth/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) throw new Error("Missing code in OAuth callback");
      const client = getOAuthClient();
      const { tokens } = await client.getToken(code);
      if (!tokens.refresh_token) {
        throw new Error("No refresh token returned — revoke the app's access at https://myaccount.google.com/permissions and try again (Google only issues a refresh token on first consent).");
      }
      persistRefreshToken(tokens.refresh_token);
      res.send(`
        <h2>Google Drive connected.</h2>
        <p>If this server's filesystem doesn't persist (Render, Cloud Run, etc.), copy this value into your host's <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> environment variable so it survives restarts/redeploys:</p>
        <textarea readonly rows="3" style="width:100%;max-width:600px;font-family:monospace;padding:8px;">${tokens.refresh_token}</textarea>
        <p>On local dev with a writable .env.local, it's already saved there — no action needed.</p>
      `);
    } catch (error: any) {
      console.error("OAuth Callback Error:", error);
      res.status(500).send(`OAuth failed: ${error.message}`);
    }
  });

  app.post("/api/drive/upload-as-user", upload.single("file"), async (req, res) => {
    try {
      if (!process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
        throw new Error("Google Drive isn't connected yet — visit /api/oauth/connect once to authorize.");
      }
      const auth = getOAuthClient();
      const drive = google.drive({ version: "v3", auth });

      const metadata = JSON.parse(req.body.metadata);
      const file = req.file;
      if (!file) throw new Error("No file uploaded");

      const response = await drive.files.create({
        requestBody: {
          name: metadata.name,
          parents: metadata.parents,
        },
        media: {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path),
        },
        fields: "id,name,webViewLink",
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Drive Upload (OAuth) Error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      if (req.file) fs.unlink(req.file.path, () => {});
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
