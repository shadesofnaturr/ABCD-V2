const API_BASE = '/api';

export interface DriveFolder {
  id: string;
  name: string;
  categoryHint?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  thumbnailLink: string;
  webViewLink: string;
  description?: string;
  categoryHint?: string;
}

async function fetchAPI(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    console.error('API Error:', errorData);
    throw new Error(errorData?.error || `API request failed with status ${res.status}`);
  }
  return res.json();
}

export async function getRootFolders(): Promise<DriveFolder[]> {
  const mainFolderId = await getOrCreateMainCatalogsFolder();
  const q = `'${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const folders: DriveFolder[] = data.files || [];
  return folders.sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export async function getFoldersInFolder(folderId: string): Promise<DriveFolder[]> {
  const q = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const folders: DriveFolder[] = data.files || [];
  return folders.sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export async function getImagesInFolder(folderId: string): Promise<DriveFile[]> {
  const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`;
  const fields = 'files(id,name,thumbnailLink,webViewLink,description)';
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}`);
  const files: DriveFile[] = data.files || [];
  return files.sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export async function copyDriveFile(fileId: string, parentId: string): Promise<DriveFile> {
  const url = `${API_BASE}/drive/files/${fileId}/copy?fields=${encodeURIComponent('id,name,thumbnailLink,webViewLink')}`;
  const res = await fetchAPI(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parents: [parentId] })
  });
  return res as DriveFile;
}

export async function createDriveFolder(folderName: string, parentId?: string): Promise<DriveFolder> {
  const url = `${API_BASE}/drive/files?fields=${encodeURIComponent('id,name')}`;
  const body: any = { name: folderName, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  
  const res = await fetchAPI(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res as DriveFolder;
}

export async function getOrCreateMainOrdersFolder(): Promise<string> {
  const q = `name='Poster App Orders' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const files = data.files || [];
  if (files.length > 0) return files[0].id;
  const folder = await createDriveFolder('Poster App Orders');
  return folder.id;
}

export async function getOrCreateMainCatalogsFolder(): Promise<string> {
  const q = `name='Poster App Catalogs' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const files = data.files || [];
  if (files.length > 0) return files[0].id;
  const folder = await createDriveFolder('Poster App Catalogs');
  return folder.id;
}

export async function getOrCreateMainCustomOrdersFolder(): Promise<string> {
  const q = `name='Custom Orders' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const files = data.files || [];
  if (files.length > 0) return files[0].id;
  const folder = await createDriveFolder('Custom Orders');
  return folder.id;
}

export async function getOrCreateCustomOrdersSheet(): Promise<string> {
  return getOrCreateOrdersSheet();
}

export async function appendCustomOrderRow(sheetId: string, rowData: string[]) {
  const range = 'Orders!A:F';
  const url = `${API_BASE}/sheets/${sheetId}/values/${range}`;
  await fetchAPI(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowData] })
  });
}

export async function updateDriveFolder(folderId: string, newName: string): Promise<DriveFolder> {
  const url = `${API_BASE}/drive/files/${folderId}?fields=${encodeURIComponent('id,name')}`;
  const res = await fetchAPI(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName })
  });
  return res as DriveFolder;
}

export async function deleteDriveFolder(folderId: string): Promise<void> {
  await fetchAPI(`${API_BASE}/drive/files/${folderId}`, { method: 'DELETE' });
}

export async function updateDriveFile(fileId: string, name: string, description: string): Promise<DriveFile> {
  const url = `${API_BASE}/drive/files/${fileId}?fields=${encodeURIComponent('id,name,thumbnailLink,webViewLink,description')}`;
  const res = await fetchAPI(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description })
  });
  return res as DriveFile;
}

export async function uploadImageToFolder(folderId: string, file: File): Promise<DriveFile> {
  const metadata = { name: file.name, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  form.append('file', file);

  const res = await fetch(`${API_BASE}/drive/upload`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    throw new Error('Upload failed');
  }
  return res.json();
}

// The service account has zero Drive storage quota, so order-zip uploads go
// through the OAuth-authorized owner account instead (one-time admin login,
// see /api/oauth/connect) — this route runs as that real account.
export async function uploadOrderZip(folderId: string, blob: Blob, filename: string): Promise<{ id: string; webViewLink: string }> {
  const metadata = { name: filename, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  form.append('file', blob, filename);

  const res = await fetch(`${API_BASE}/drive/upload-as-user`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || 'Zip upload failed');
  }
  return res.json();
}

export async function getOrCreateOrdersUploadFolder(): Promise<string> {
  const q = `name='Orders' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const files = data.files || [];
  if (files.length > 0) return files[0].id;
  throw new Error("No Drive folder named 'Orders' found — create one and share it with the connected account.");
}

export async function getOrCreateOrdersSheet(): Promise<string> {
  const q = `name='Poster Orders' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const files = data.files || [];
  if (files.length > 0) {
    const sheetId = files[0].id;
    await ensureOrdersSheetHasZipLinkColumn(sheetId);
    return sheetId;
  }

  const createRes = await fetchAPI(`${API_BASE}/sheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: 'Poster Orders' },
      sheets: [{ properties: { title: 'Orders' } }]
    })
  });

  const sheetId = createRes.spreadsheetId;
  await appendOrderRow(sheetId, ['Date', 'Customer Name', 'Phone Number', 'Selected Posters', 'Poster Count', 'User Email', 'Zip Link']);
  return sheetId;
}

// Older sheets were created before the 'Zip Link' column existed — backfill
// the header once so existing spreadsheets pick it up without manual edits.
async function ensureOrdersSheetHasZipLinkColumn(sheetId: string): Promise<void> {
  try {
    const data = await fetchAPI(`${API_BASE}/sheets/${sheetId}/values/Orders!G1`);
    const hasHeader = (data.values?.[0]?.[0] || '').trim().length > 0;
    if (!hasHeader) {
      await fetchAPI(`${API_BASE}/sheets/${sheetId}/values/Orders!G1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [['Zip Link']] })
      });
    }
  } catch (err) {
    console.warn('Could not verify/backfill Zip Link column:', err);
  }
}

export async function appendOrderRow(sheetId: string, rowData: string[]) {
  const range = 'Orders!A:G';
  const url = `${API_BASE}/sheets/${sheetId}/values/${range}`;
  await fetchAPI(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowData] })
  });
}

export interface SheetOrder {
  date: string;
  customerName: string;
  phone: string;
  posters: string;
  count: string;
  email: string;
  zipLink: string;
}

export async function fetchUserOrdersFromSheet(email: string, phone: string): Promise<SheetOrder[]> {
  try {
    const sheetId = await getOrCreateOrdersSheet();
    const range = 'Orders!A:G';
    const data = await fetchAPI(`${API_BASE}/sheets/${sheetId}/values/${range}`);
    const rows = data.values || [];

    // Skip header row
    const orders: SheetOrder[] = rows.slice(1).map((row: any[]) => ({
      date: row[0] || '',
      customerName: row[1] || '',
      phone: row[2] || '',
      posters: row[3] || '',
      count: row[4] || '',
      email: row[5] || '',
      zipLink: row[6] || ''
    }));
    
    return orders.filter(o => {
      if (email && o.email && o.email.toLowerCase() === email.toLowerCase()) return true;
      if (phone && o.phone && o.phone.replace(/[\s-]/g, '') === phone.replace(/[\s-]/g, '')) return true;
      return false;
    }).reverse();
  } catch (err) {
    console.error('Error fetching user orders from sheet:', err);
    return [];
  }
}

export async function getOrCreateUsersSheet(): Promise<string> {
  const q = `name='Poster Orders' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const files = data.files || [];
  
  if (files.length === 0) {
    // If Orders sheet doesn't exist, this implies we can't create it due to quota, but let's try fallback to getOrCreateOrdersSheet
    return getOrCreateOrdersSheet();
  }
  
  const sheetId = files[0].id;

  // Let's check if Users sheet exists by fetching the spreadsheet details
  try {
    const spreadsheet = await fetchAPI(`${API_BASE}/sheets/${sheetId}?fields=${encodeURIComponent('sheets.properties.title')}`);
    const sheetExists = spreadsheet.sheets?.some((s: any) => s.properties.title === 'Users');
    if (!sheetExists) {
      await fetchAPI(`${API_BASE}/sheets/${sheetId}/batchUpdate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            addSheet: { properties: { title: 'Users' } }
          }]
        })
      });
      await appendUserRow(sheetId, ['Email', 'Password', 'Created At', 'Security Question', 'Answer', 'Name', 'Phone']);
    }
  } catch (err) {
    console.warn("Could not check or add Users sheet:", err);
  }
  
  return sheetId;
}

export async function appendUserRow(sheetId: string, rowData: string[]) {
  const paddedRow = [...rowData];
  while (paddedRow.length < 7) {
    paddedRow.push('');
  }
  const range = 'Users!A:G';
  const url = `${API_BASE}/sheets/${sheetId}/values/${range}`;
  await fetchAPI(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [paddedRow] })
  });
}

export async function updateUserRow(sheetId: string, rowIndex: number, rowData: string[]) {
  const paddedRow = [...rowData];
  while (paddedRow.length < 7) {
    paddedRow.push('');
  }
  const range = `Users!A${rowIndex + 1}:G${rowIndex + 1}`;
  const url = `${API_BASE}/sheets/${sheetId}/values/${range}`;
  await fetchAPI(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [paddedRow] })
  });
}

export async function fetchAllUsers(sheetId: string): Promise<string[][]> {
  const url = `${API_BASE}/sheets/${sheetId}/values/Users!A:G`;
  const data = await fetchAPI(url, { method: 'GET' });
  return data.values || [];
}
