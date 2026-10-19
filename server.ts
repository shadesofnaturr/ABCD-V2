import dotenv from "dotenv";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import multer from "multer";
import { Readable } from "stream";

dotenv.config({ path: ".env.local" });

const upload = multer();

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
          body: Readable.from(file.buffer),
        },
        fields: 'id,name,thumbnailLink,webViewLink,description',
      });

      res.json(response.data);
    } catch (error: any) {
      console.error('Drive Upload Error:', error);
      res.status(500).json({ error: error.message });
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
