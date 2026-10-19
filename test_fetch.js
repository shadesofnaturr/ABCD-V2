const API_BASE = 'http://localhost:3000/api';

async function fetchAPI(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.error || `Status ${res.status}`);
  }
  return res.json();
}

async function start() {
    const q = `name='Poster Orders' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const data = await fetchAPI(`${API_BASE}/drive/files?method=list&q=${encodeURIComponent(q)}&fields=${encodeURIComponent('files(id,name)')}`);
    const files = data.files || [];
    const sheetId = files[0].id;
    const range = 'Orders!A:F';
    const data2 = await fetchAPI(`${API_BASE}/sheets/${sheetId}/values/${range}`);
    console.log(data2.values);
}

start();
