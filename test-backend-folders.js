async function run() {
  const mainFolderId = '1HRUurt0Wf_gXOc-QxcZOG2mcbOpvEUn3';
  const q = `'${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await fetch(`http://localhost:3000/api/drive/files?method=list&q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=name`);
  const data = await res.json();
  console.log(data);
}
run();
