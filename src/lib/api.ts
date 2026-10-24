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
// see /api/oauth/connect). Large orders can produce zips well over hosting
// platforms' request-size limits (e.g. Cloud Run's hard 32MB cap) — and
// Google's resumable-upload endpoint doesn't send CORS headers, so a direct
// browser-to-Drive PUT isn't possible at all. So this sends the zip to our
// own server in small chunks (each well under any platform's size limit),
// and the server relays each chunk to Drive server-to-server (not subject to
// CORS). onProgress reports a 0-1 fraction of bytes uploaded.
const UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024; // must be a multiple of 256KiB per Drive's resumable upload spec

export async function uploadOrderZip(folderId: string, blob: Blob, filename: string, onProgress?: (fraction: number) => void): Promise<{ id: string; webViewLink: string }> {
  const sessionRes = await fetch(`${API_BASE}/drive/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: filename, parents: [folderId], mimeType: 'application/zip' })
  });
  if (!sessionRes.ok) {
    const errorData = await sessionRes.json().catch(() => null);
    throw new Error(errorData?.error || 'Could not start Drive upload session');
  }
  const { uploadUrl } = await sessionRes.json();

  const totalSize = blob.size;
  let offset = 0;
  while (offset < totalSize) {
    const end = Math.min(offset + UPLOAD_CHUNK_SIZE, totalSize);
    const chunk = blob.slice(offset, end);

    const chunkRes = await fetch(`${API_BASE}/drive/upload-chunk`, {
      method: 'POST',
      headers: {
        'X-Upload-Url': uploadUrl,
        'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
        // blob.slice() drops the MIME type, so without an explicit Content-Type
        // the chunk goes out typeless and the server's express.raw parser skips
        // it (req.body ends up {} and relays as the 15-byte "[object Object]").
        'Content-Type': 'application/octet-stream',
      },
      body: chunk
    });

    if (chunkRes.status === 308) {
      // Resume Incomplete — expected for every chunk except the last.
      offset = end;
      onProgress?.(offset / totalSize);
      continue;
    }

    if (chunkRes.ok) {
      onProgress?.(1);
      return chunkRes.json();
    }

    const text = await chunkRes.text().catch(() => '');
    throw new Error(`Zip upload to Drive failed: ${chunkRes.status} ${text}`);
  }

  throw new Error('Zip upload to Drive ended without a final response');
}

// --- Server-side streaming order build ---
// The browser POSTs just the order manifest; the server fetches full-res
// images, builds one print-ready PDF per size, and uploads them to a per-order
// Drive folder — streaming NDJSON progress back as it goes. This replaces the
// old browser-side PDF build + zip upload entirely (which OOM'd on big orders).
export interface BuildProgressEvent {
  phase?: 'generating' | 'uploading';
  fetched?: number;
  total?: number;
  size?: string;
  percent?: number;
}

export interface OrderBuildResult {
  orderFolderId: string;
  orderFolderLink: string;
  files: { size: string; id: string; link: string; bytes: number; sheets: number; missing: string[] }[];
}

export interface OrderManifest {
  lines: { poster: { id: string; name: string }; size: string; quantity: number }[];
  customerName?: string;
}

export async function submitOrderBuild(manifest: OrderManifest, onProgress?: (e: BuildProgressEvent) => void): Promise<OrderBuildResult> {
  const res = await fetch(`${API_BASE}/orders/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manifest)
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `Order build failed with status ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: OrderBuildResult | null = null;

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let evt: any;
    try { evt = JSON.parse(trimmed); } catch { return; }
    if (evt.error) throw new Error(evt.error);
    if (evt.done) result = evt as OrderBuildResult;
    else onProgress?.(evt as BuildProgressEvent);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  handleLine(buffer);

  if (!result) throw new Error('Order build ended without a result');
  return result;
}

// The order-zip upload runs under the OAuth account with the narrow drive.file
// scope, which can only write into folders that same OAuth client created. So
// the upload folder is resolved (and created on first use) server-side via the
// OAuth client — not the service account — otherwise its parent would be
// invisible to the upload and Drive would reject it with a 404.
export async function getOrCreateOrdersUploadFolder(): Promise<string> {
  const data = await fetchAPI(`${API_BASE}/drive/oauth-upload-folder`);
  if (!data.id) throw new Error('Could not resolve the Drive upload folder');
  return data.id;
}

export async function getOrCreateOrdersSheet(): Promise<string> {
  const q = `name='Poster Orders' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
  const files = data.files || [];
  if (files.length > 0) {
    const sheetId = files[0].id;
    await ensureOrdersSheetColumns(sheetId);
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
  await appendOrderRow(sheetId, ['Date', 'Customer Name', 'Phone Number', 'Selected Posters', 'Poster Count', 'User Email', 'Order Link', 'Status']);
  return sheetId;
}

// Older sheets predate the 'Order Link' (G) and 'Status' (H) columns — backfill
// those headers once so existing spreadsheets pick them up without manual edits.
async function ensureOrdersSheetColumns(sheetId: string): Promise<void> {
  try {
    const data = await fetchAPI(`${API_BASE}/sheets/${sheetId}/values/Orders!G1:H1`);
    const g = (data.values?.[0]?.[0] || '').trim();
    const h = (data.values?.[0]?.[1] || '').trim();
    if (!g || !h) {
      await fetchAPI(`${API_BASE}/sheets/${sheetId}/values/Orders!G1:H1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[g || 'Order Link', h || 'Status']] })
      });
    }
  } catch (err) {
    console.warn('Could not verify/backfill Order Link/Status columns:', err);
  }
}

// Appends a row and returns its 1-based sheet row index (so the caller can
// update its Status/link later once the print files finish building).
export async function appendOrderRow(sheetId: string, rowData: string[]): Promise<number | null> {
  const range = 'Orders!A:H';
  const url = `${API_BASE}/sheets/${sheetId}/values/${range}`;
  const data = await fetchAPI(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowData] })
  });
  const m = /!A(\d+)/.exec(data?.updates?.updatedRange || '');
  return m ? parseInt(m[1], 10) : null;
}

// Updates an existing order row's Order Link (G) and Status (H) in place.
export async function updateOrderRowStatus(sheetId: string, rowIndex: number, link: string, status: string): Promise<void> {
  const range = `Orders!G${rowIndex}:H${rowIndex}`;
  const url = `${API_BASE}/sheets/${sheetId}/values/${range}`;
  await fetchAPI(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[link, status]] })
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
  status: string;
}

export async function fetchUserOrdersFromSheet(email: string, phone: string): Promise<SheetOrder[]> {
  try {
    const sheetId = await getOrCreateOrdersSheet();
    const range = 'Orders!A:H';
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
      zipLink: row[6] || '',
      status: row[7] || ''
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
