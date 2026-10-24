// Server-side, streaming order-PDF builder.
//
// Unlike the browser pipeline (which downloads every image, builds the whole
// PDF, and zips it all in memory — and OOMs on large orders), this runs on the
// server and keeps memory bounded regardless of order size:
//   - images are fetched one at a time and released after embedding
//   - each per-size PDF streams to a temp file via PDFKit (backpressured)
//   - each file streams straight to Drive, then is deleted
// Full print resolution is preserved: JPEG bytes are embedded as-is (DCTDecode),
// PNGs losslessly — nothing is re-encoded or downscaled.
import PDFDocument from "pdfkit";
import { google } from "googleapis";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { Transform } from "stream";

// --- Print geometry (must match src/lib/pdf.ts exactly) ---
interface PrintSizeDef { key: string; widthIn: number; heightIn: number; }
const PRINT_SIZES: Record<string, PrintSizeDef> = {
  A4: { key: "A4", widthIn: 8.27, heightIn: 11.69 },
  A5: { key: "A5", widthIn: 6, heightIn: 8.2 },
  "A4 Oversize": { key: "A4 Oversize", widthIn: 9, heightIn: 12.5 },
  A3: { key: "A3", widthIn: 12.5, heightIn: 18.5 },
};
const PRINT_SIZE_KEYS = ["A4", "A5", "A4 Oversize", "A3"];
const PT_PER_IN = 72;
const SHEET_W_IN = 13, SHEET_H_IN = 19, GAP_IN = 0.5, MARGIN_IN = 0.25;
const USABLE_W_IN = SHEET_W_IN - MARGIN_IN, USABLE_H_IN = SHEET_H_IN - MARGIN_IN;
const EPS_IN = 0.001;
const CROP_MARK_SIZES = new Set(["A4", "A5"]);
const CROP_MARK_HALF_LEN_IN = 0.25;
const CROP_MARK_THICKNESS = 1.5;
const CROP_MARK_CLEARANCE_IN = 0.25;
const CROP_MARK_COLOR = "#737373";

interface Orientation { w: number; h: number; }
interface Placement { posterId: string; posterName: string; x: number; y: number; w: number; h: number; }

function orientationsOf(s: PrintSizeDef): Orientation[] { return [{ w: s.widthIn, h: s.heightIn }, { w: s.heightIn, h: s.widthIn }]; }
function gridCapacity(w: number, h: number): number {
  const cols = Math.floor((USABLE_W_IN + GAP_IN) / (w + GAP_IN) + EPS_IN);
  const rows = Math.floor((USABLE_H_IN + GAP_IN) / (h + GAP_IN) + EPS_IN);
  return cols <= 0 || rows <= 0 ? 0 : cols * rows;
}
function bestOrientation(size: PrintSizeDef) {
  let best: { orientation: Orientation; cols: number; rows: number; capacity: number } | null = null;
  for (const o of orientationsOf(size)) {
    const cols = Math.floor((USABLE_W_IN + GAP_IN) / (o.w + GAP_IN) + EPS_IN);
    const rows = Math.floor((USABLE_H_IN + GAP_IN) / (o.h + GAP_IN) + EPS_IN);
    const capacity = gridCapacity(o.w, o.h);
    if (!best || capacity > best.capacity) best = { orientation: o, cols, rows, capacity };
  }
  return best!;
}
function packSingleSize(posters: { id: string; name: string }[], sizeKey: string): Placement[][] {
  const def = PRINT_SIZES[sizeKey];
  const { orientation, cols, capacity } = bestOrientation(def);
  if (capacity === 0) throw new Error(`Size "${sizeKey}" doesn't fit the sheet`);
  const sheets: Placement[][] = [];
  for (let start = 0; start < posters.length; start += capacity) {
    const batch = posters.slice(start, start + capacity);
    sheets.push(batch.map((p, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      return { posterId: p.id, posterName: p.name, x: c * (orientation.w + GAP_IN), y: r * (orientation.h + GAP_IN), w: orientation.w, h: orientation.h };
    }));
  }
  return sheets;
}

// --- image dimensions straight from the bytes (no browser / canvas) ---
function readImageSize(buf: Buffer): { w: number; h: number } {
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off < buf.length - 8) {
      if (buf[off] !== 0xff) { off++; continue; }
      const marker = buf[off + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) };
      }
      off += 2 + buf.readUInt16BE(off + 2);
    }
  }
  throw new Error("unsupported image format");
}

// --- crop marks (PDFKit top-left, y-down coords) ---
function drawCropMarks(doc: PDFKit.PDFDocument, cols: number, rows: number, cellW: number, cellH: number) {
  const colX = (b: number) => b === 0 ? MARGIN_IN : b === cols ? MARGIN_IN + cols * cellW + (cols - 1) * GAP_IN : MARGIN_IN + b * cellW + (b - 0.5) * GAP_IN;
  const rowY = (b: number) => b === 0 ? MARGIN_IN : b === rows ? MARGIN_IN + rows * cellH + (rows - 1) * GAP_IN : MARGIN_IN + b * cellH + (b - 0.5) * GAP_IN;
  const X = (xIn: number) => xIn * PT_PER_IN, Y = (yIn: number) => yIn * PT_PER_IN;
  const line = (x1: number, y1: number, x2: number, y2: number) => doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.save().lineWidth(CROP_MARK_THICKNESS).strokeColor(CROP_MARK_COLOR);
  const vTick = (xIn: number, yIn: number) => line(X(xIn), Y(yIn - CROP_MARK_HALF_LEN_IN), X(xIn), Y(yIn + CROP_MARK_HALF_LEN_IN));
  const hTick = (xIn: number, yIn: number) => line(X(xIn - CROP_MARK_HALF_LEN_IN), Y(yIn), X(xIn + CROP_MARK_HALF_LEN_IN), Y(yIn));
  const cross = (xIn: number, yIn: number) => { vTick(xIn, yIn); hTick(xIn, yIn); };

  if (cols === 1 && rows > 1) {
    const x = colX(cols) + CROP_MARK_CLEARANCE_IN;
    vTick(x, rowY(0)); vTick(x, rowY(rows));
    for (let r = 1; r < rows; r++) cross(x, rowY(r));
    doc.restore(); return;
  }
  if (rows === 1 && cols > 1) {
    const y = rowY(rows);
    hTick(colX(0), y); hTick(colX(cols), y);
    for (let b = 1; b < cols; b++) cross(colX(b), y);
    doc.restore(); return;
  }
  const bottomY = rowY(rows) + CROP_MARK_CLEARANCE_IN;
  for (let b = 1; b < cols; b++) { vTick(colX(b), rowY(0)); cross(colX(b), bottomY); }
  for (let r = 1; r < rows; r++) { hTick(colX(0), rowY(r)); hTick(colX(cols), rowY(r)); }
  hTick(colX(0), bottomY); hTick(colX(cols), bottomY);
  for (let b = 1; b < cols; b++) for (let r = 1; r < rows; r++) cross(colX(b), rowY(r));
  doc.restore();
}

function drawPlacement(doc: PDFKit.PDFDocument, p: Placement, buf: Buffer, dims: { w: number; h: number }) {
  const imageIsLandscape = dims.w > dims.h;
  const frameIsLandscape = p.w > p.h;
  const needsRotate = imageIsLandscape !== frameIsLandscape;
  const effW = needsRotate ? dims.h : dims.w;
  const effH = needsRotate ? dims.w : dims.h;
  const scale = Math.max(p.w / effW, p.h / effH);
  const drawW = effW * scale, drawH = effH * scale; // on-page inches

  const fx = (MARGIN_IN + p.x) * PT_PER_IN, fy = (MARGIN_IN + p.y) * PT_PER_IN;
  const fw = p.w * PT_PER_IN, fh = p.h * PT_PER_IN;
  const dw = drawW * PT_PER_IN, dh = drawH * PT_PER_IN;

  doc.save();
  doc.rect(fx, fy, fw, fh).clip();
  if (needsRotate) {
    doc.translate(fx + fw / 2, fy + fh / 2).rotate(90, { origin: [0, 0] });
    // local axes are rotated 90deg, so the image's on-page vertical extent (dh)
    // is its local width and the horizontal extent (dw) is its local height.
    doc.image(buf, -dh / 2, -dw / 2, { width: dh, height: dw });
  } else {
    doc.image(buf, fx + (fw - dw) / 2, fy + (fh - dh) / 2, { width: dw, height: dh });
  }
  doc.restore();
}

// --- auth (service account reads catalogs; OAuth owner writes order PDFs) ---
function serviceDrive() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}
function oauthDrive() {
  const client = new google.auth.OAuth2(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET, process.env.GOOGLE_OAUTH_REDIRECT_URI);
  client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return google.drive({ version: "v3", auth: client });
}

async function fetchImage(drive: any, fileId: string): Promise<Buffer> {
  const r = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  return Buffer.from(r.data as ArrayBuffer);
}

async function findOrCreateFolder(drive: any, name: string, parentId?: string): Promise<string> {
  const parentClause = parentId ? `'${parentId}' in parents and ` : "";
  const existing = await drive.files.list({
    q: `${parentClause}name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
  });
  if (existing.data.files?.[0]?.id) return existing.data.files[0].id;
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined },
    fields: "id",
  });
  return created.data.id;
}

export interface OrderManifestLine { poster: { id: string; name: string }; size: string; quantity: number; }
export interface BuildResult {
  orderFolderId: string;
  orderFolderLink: string;
  files: { size: string; id: string; link: string; bytes: number; sheets: number; missing: string[] }[];
}
export type BuildProgress =
  | { phase: "generating"; fetched: number; total: number }
  | { phase: "uploading"; size: string; percent: number };

// How many images to download concurrently. Small enough that peak memory
// stays bounded (a few images in flight + PDFKit's buffer), big enough to
// overlap network latency instead of fetching strictly one at a time.
const FETCH_CONCURRENCY = 4;

// Builds one size's PDF to a temp file. Images are prefetched in a sliding
// window of FETCH_CONCURRENCY so downloads overlap, but are embedded strictly
// in page order and released right after, so memory never holds more than the
// window's worth of images.
async function buildSizePdfToFile(sheets: Placement[][], sizeKey: string, tmpPath: string, read: any, onImageDone: () => void, missing: string[]): Promise<void> {
  const cropMarks = CROP_MARK_SIZES.has(sizeKey) ? bestOrientation(PRINT_SIZES[sizeKey]) : null;
  const flat: { sheetIdx: number; placement: Placement }[] = [];
  sheets.forEach((s, si) => s.forEach((p) => flat.push({ sheetIdx: si, placement: p })));

  const doc = new PDFDocument({ autoFirstPage: false });
  const out = fs.createWriteStream(tmpPath);
  const done = new Promise<void>((res, rej) => { out.on("finish", () => res()); out.on("error", rej); doc.on("error", rej); });
  doc.pipe(out);

  const inflight = new Map<number, Promise<Buffer | null>>();
  const startFetch = (i: number) => { if (i < flat.length && !inflight.has(i)) inflight.set(i, fetchImage(read, flat[i].placement.posterId).catch(() => null)); };
  for (let i = 0; i < FETCH_CONCURRENCY; i++) startFetch(i);

  let currentSheet = -1;
  const finishSheetCropMarks = () => { if (currentSheet !== -1 && cropMarks) drawCropMarks(doc, cropMarks.cols, cropMarks.rows, cropMarks.orientation.w, cropMarks.orientation.h); };

  for (let i = 0; i < flat.length; i++) {
    const { sheetIdx, placement } = flat[i];
    if (sheetIdx !== currentSheet) {
      finishSheetCropMarks();
      doc.addPage({ size: [SHEET_W_IN * PT_PER_IN, SHEET_H_IN * PT_PER_IN], margin: 0 });
      currentSheet = sheetIdx;
    }
    const buf = await inflight.get(i)!;
    inflight.delete(i);
    startFetch(i + FETCH_CONCURRENCY);
    if (!buf) missing.push(`${placement.posterName} (download failed)`);
    else {
      try { drawPlacement(doc, placement, buf, readImageSize(buf)); }
      catch (e: any) { missing.push(`${placement.posterName} (draw: ${e.message})`); }
    }
    onImageDone();
  }
  finishSheetCropMarks();
  doc.end();
  await done;
}

// Streams a finished PDF file to Drive, reporting 0-100 upload percent as the
// bytes flow (via a counting transform) without buffering the file in memory.
async function streamUpload(write: any, tmpPath: string, name: string, parentId: string, onPercent: (p: number) => void) {
  const total = fs.statSync(tmpPath).size;
  let sent = 0, lastPct = -1;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      sent += chunk.length;
      const pct = total > 0 ? Math.floor((sent / total) * 100) : 100;
      if (pct !== lastPct) { lastPct = pct; onPercent(pct); }
      cb(null, chunk);
    },
  });
  fs.createReadStream(tmpPath).pipe(counter);
  const res = await write.files.create({
    requestBody: { name, parents: [parentId] },
    media: { mimeType: "application/pdf", body: counter },
    fields: "id,name,webViewLink",
  });
  return res.data;
}

// Builds one PDF per size (streaming to a temp file), uploads each to a
// per-order Drive subfolder, and returns the links. Memory stays bounded to
// roughly the fetch-window's worth of images. onProgress reports generating
// (images embedded so far) and uploading (percent) as it goes.
export async function buildAndUploadOrder(manifest: { lines: OrderManifestLine[]; customerName?: string }, onProgress?: (p: BuildProgress) => void): Promise<BuildResult> {
  const read = serviceDrive();
  const write = oauthDrive();

  const ordersFolderId = await findOrCreateFolder(write, "Orders");
  const safe = (s: string) => (s || "Order").replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 80);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const orderFolderId = await findOrCreateFolder(write, `${safe(manifest.customerName || "Order")} - ${stamp}`, ordersFolderId);

  // group by size, expanding quantities into individual placements
  const bySize = new Map<string, { id: string; name: string }[]>();
  for (const line of manifest.lines) {
    if (line.quantity <= 0) continue;
    const sizeKey = PRINT_SIZES[line.size] ? line.size : PRINT_SIZE_KEYS[0];
    const list = bySize.get(sizeKey) || [];
    for (let i = 0; i < line.quantity; i++) list.push(line.poster);
    bySize.set(sizeKey, list);
  }

  const total = Array.from(bySize.values()).reduce((s, list) => s + list.length, 0);
  let fetched = 0;

  const files: BuildResult["files"] = [];
  for (const [sizeKey, posters] of bySize) {
    const sheets = packSingleSize(posters, sizeKey);
    const tmpPath = path.join(os.tmpdir(), `order-${crypto.randomBytes(6).toString("hex")}-${sizeKey.replace(/[^A-Za-z0-9]/g, "")}.pdf`);
    const missing: string[] = [];

    await buildSizePdfToFile(sheets, sizeKey, tmpPath, read, () => { fetched++; onProgress?.({ phase: "generating", fetched, total }); }, missing);

    const bytes = fs.statSync(tmpPath).size;
    const safeName = sizeKey.replace(/[\\/:*?"<>|]/g, "-");
    const uploaded = await streamUpload(write, tmpPath, `${safeName}.pdf`, orderFolderId, (pct) => onProgress?.({ phase: "uploading", size: sizeKey, percent: pct }));
    fs.unlink(tmpPath, () => {});

    files.push({ size: sizeKey, id: uploaded.id!, link: uploaded.webViewLink || "", bytes, sheets: sheets.length, missing });
  }

  return { orderFolderId, orderFolderLink: `https://drive.google.com/drive/folders/${orderFolderId}`, files };
}
