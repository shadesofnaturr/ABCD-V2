import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: 'v3', auth });
  const q = `'1HRUurt0Wf_gXOc-QxcZOG2mcbOpvEUn3' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({ q, fields: 'files(id,name,owners)' });
  console.log(JSON.stringify(res.data.files, null, 2));
}

run();
