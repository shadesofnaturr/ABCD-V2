import { PDFDocument, PDFImage } from 'pdf-lib';
import { DriveFile } from './api';

// --- Print sizes, in inches (matches the print-shop layout spec exactly) ---
interface PrintSizeDef {
  key: string;
  widthIn: number;
  heightIn: number;
}

const PRINT_SIZES: Record<string, PrintSizeDef> = {
  A4: { key: 'A4', widthIn: 8.27, heightIn: 11.69 },
  A5: { key: 'A5', widthIn: 6, heightIn: 8 },
  'A4 Oversize': { key: 'A4 Oversize', widthIn: 9, heightIn: 12.5 },
  A3: { key: 'A3', widthIn: 12.5, heightIn: 18.5 },
};

export const PRINT_SIZE_KEYS = ['A4', 'A5', 'A4 Oversize', 'A3'] as const;

const PT_PER_IN = 72;
const SHEET_W_IN = 13;
const SHEET_H_IN = 19;
const GAP_IN = 0.5;
const MARGIN_IN = 0.25;
// Margin is reserved only on the leading (top/left) edge — any leftover space
// from a grid that doesn't perfectly tile the sheet is left on the trailing
// (bottom/right) edge, not split symmetrically. Confirmed against the spec:
// a 6x8 grid leaves 0.25in top but 2.25in at the bottom, not 0.25in both sides.
const USABLE_W_IN = SHEET_W_IN - MARGIN_IN;
const USABLE_H_IN = SHEET_H_IN - MARGIN_IN;
const EPS_IN = 0.001;

interface Orientation {
  w: number;
  h: number;
  rotated: boolean;
}

interface PrintJob {
  poster: DriveFile;
  sizeKey: string;
}

interface Placement {
  poster: DriveFile;
  x: number; // inches, from top-left of the margin-inset area
  y: number;
  w: number;
  h: number;
}

interface SheetPlan {
  placements: Placement[];
}

function orientationsOf(size: PrintSizeDef): Orientation[] {
  return [
    { w: size.widthIn, h: size.heightIn, rotated: false },
    { w: size.heightIn, h: size.widthIn, rotated: true },
  ];
}

function gridCapacity(w: number, h: number): number {
  const cols = Math.floor((USABLE_W_IN + GAP_IN) / (w + GAP_IN) + EPS_IN);
  const rows = Math.floor((USABLE_H_IN + GAP_IN) / (h + GAP_IN) + EPS_IN);
  if (cols <= 0 || rows <= 0) return 0;
  return cols * rows;
}

function bestOrientation(size: PrintSizeDef): { orientation: Orientation; capacity: number } {
  const orientations = orientationsOf(size);
  let best = { orientation: orientations[0], capacity: gridCapacity(orientations[0].w, orientations[0].h) };
  for (let i = 1; i < orientations.length; i++) {
    const capacity = gridCapacity(orientations[i].w, orientations[i].h);
    if (capacity > best.capacity) {
      best = { orientation: orientations[i], capacity };
    }
  }
  return best;
}

// Phase A: tile same-size jobs into dedicated full grids; whatever doesn't
// complete a grid is returned as a remainder for Phase B.
function packDedicatedGrids(jobsBySize: Map<string, PrintJob[]>): { sheets: SheetPlan[]; remainders: PrintJob[] } {
  const sheets: SheetPlan[] = [];
  const remainders: PrintJob[] = [];

  for (const [sizeKey, jobs] of jobsBySize) {
    const sizeDef = PRINT_SIZES[sizeKey];
    const { orientation, capacity } = bestOrientation(sizeDef);
    if (capacity === 0) {
      // Doesn't fit the sheet at all, even alone. Shouldn't happen for the supported sizes.
      remainders.push(...jobs);
      continue;
    }
    const cols = Math.floor((USABLE_W_IN + GAP_IN) / (orientation.w + GAP_IN) + EPS_IN);
    const rows = Math.floor((USABLE_H_IN + GAP_IN) / (orientation.h + GAP_IN) + EPS_IN);

    let idx = 0;
    while (jobs.length - idx >= capacity) {
      const placements: Placement[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          placements.push({
            poster: jobs[idx++].poster,
            x: c * (orientation.w + GAP_IN),
            y: r * (orientation.h + GAP_IN),
            w: orientation.w,
            h: orientation.h,
          });
        }
      }
      sheets.push({ placements });
    }
    for (; idx < jobs.length; idx++) {
      remainders.push(jobs[idx]);
    }
  }

  return { sheets, remainders };
}

interface Shelf {
  y: number;
  height: number;
  usedWidth: number;
}

interface MixedSheet {
  placements: Placement[];
  shelves: Shelf[];
  usedHeight: number;
}

// Phase B: shelf-pack leftovers of possibly-different sizes onto shared sheets.
function packRemainders(remainders: PrintJob[], preferredOrientation: Map<string, Orientation>): SheetPlan[] {
  const sorted = [...remainders].sort((a, b) => {
    const sa = PRINT_SIZES[a.sizeKey];
    const sb = PRINT_SIZES[b.sizeKey];
    return sb.widthIn * sb.heightIn - sa.widthIn * sa.heightIn;
  });

  const sheets: MixedSheet[] = [];

  for (const job of sorted) {
    const sizeDef = PRINT_SIZES[job.sizeKey];
    const preferred = preferredOrientation.get(job.sizeKey);
    const candidates = preferred
      ? [preferred, ...orientationsOf(sizeDef).filter(o => o.rotated !== preferred.rotated)]
      : orientationsOf(sizeDef);

    let placed = false;

    // Try to slot into an existing shelf on an existing sheet.
    for (const sheet of sheets) {
      for (const orientation of candidates) {
        for (const shelf of sheet.shelves) {
          const needed = shelf.usedWidth === 0 ? orientation.w : shelf.usedWidth + GAP_IN + orientation.w;
          if (orientation.h <= shelf.height + EPS_IN && needed <= USABLE_W_IN + EPS_IN) {
            const x = shelf.usedWidth === 0 ? 0 : shelf.usedWidth + GAP_IN;
            sheet.placements.push({ poster: job.poster, x, y: shelf.y, w: orientation.w, h: orientation.h });
            shelf.usedWidth = needed;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
    }
    if (placed) continue;

    // Try starting a new shelf below the last one on an existing sheet.
    for (const sheet of sheets) {
      for (const orientation of candidates) {
        const y = sheet.usedHeight === 0 ? 0 : sheet.usedHeight + GAP_IN;
        if (orientation.w <= USABLE_W_IN + EPS_IN && y + orientation.h <= USABLE_H_IN + EPS_IN) {
          sheet.shelves.push({ y, height: orientation.h, usedWidth: orientation.w });
          sheet.placements.push({ poster: job.poster, x: 0, y, w: orientation.w, h: orientation.h });
          sheet.usedHeight = y + orientation.h;
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (placed) continue;

    // New sheet.
    const orientation = candidates[0];
    const sheet: MixedSheet = {
      placements: [{ poster: job.poster, x: 0, y: 0, w: orientation.w, h: orientation.h }],
      shelves: [{ y: 0, height: orientation.h, usedWidth: orientation.w }],
      usedHeight: orientation.h,
    };
    sheets.push(sheet);
  }

  return sheets.map(s => ({ placements: s.placements }));
}

// The /api/drive/files/:id/download proxy doesn't reliably forward Content-Type,
// so blob.type can't be trusted to tell PNG from JPEG — sniff the real format instead.
function sniffImageType(bytes: ArrayBuffer): 'image/png' | 'image/jpeg' {
  const header = new Uint8Array(bytes, 0, Math.min(8, bytes.byteLength));
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    return 'image/png';
  }
  return 'image/jpeg';
}

async function probeImageDimensions(blob: Blob): Promise<{ w: number; h: number }> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    return { w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function rotateImageBlob(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    const rotatedBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!rotatedBlob) throw new Error('Canvas toBlob failed');
    return rotatedBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface CachedImage {
  bytes: ArrayBuffer;
  type: string;
  naturalW: number;
  naturalH: number;
}

export interface OrderLine {
  poster: DriveFile;
  size: string;
  quantity: number;
}

export async function buildOrderPDF(lines: OrderLine[]): Promise<Blob> {
  // 1. Flatten the cart into individual print jobs, grouped by size.
  const jobsBySize = new Map<string, PrintJob[]>();
  for (const line of lines) {
    const sizeKey = PRINT_SIZES[line.size] ? line.size : PRINT_SIZE_KEYS[0];
    if (line.quantity <= 0) continue;
    const list = jobsBySize.get(sizeKey) || [];
    for (let i = 0; i < line.quantity; i++) list.push({ poster: line.poster, sizeKey });
    jobsBySize.set(sizeKey, list);
  }
  if (jobsBySize.size === 0) {
    throw new Error('No posters to lay out into a PDF');
  }

  // 2. Phase A: dedicated same-size grids, Phase B: shared remainder sheets.
  const preferredOrientation = new Map<string, Orientation>();
  for (const sizeKey of jobsBySize.keys()) {
    preferredOrientation.set(sizeKey, bestOrientation(PRINT_SIZES[sizeKey]).orientation);
  }
  const { sheets: gridSheets, remainders } = packDedicatedGrids(jobsBySize);
  const mixedSheets = remainders.length > 0 ? packRemainders(remainders, preferredOrientation) : [];
  const allSheets = [...gridSheets, ...mixedSheets];

  // 3. Fetch each unique poster image once, in parallel.
  const uniquePosters = new Map<string, DriveFile>();
  for (const sheet of allSheets) {
    for (const placement of sheet.placements) {
      uniquePosters.set(placement.poster.id, placement.poster);
    }
  }

  const imageCache = new Map<string, CachedImage>();
  await Promise.all(Array.from(uniquePosters.values()).map(async (poster) => {
    try {
      const response = await fetch(`/api/drive/files/${poster.id}/download`);
      if (!response.ok) {
        console.error('Failed to download image', poster.name);
        return;
      }
      const blob = await response.blob();
      const [bytes, dims] = await Promise.all([blob.arrayBuffer(), probeImageDimensions(blob)]);
      imageCache.set(poster.id, { bytes, type: sniffImageType(bytes), naturalW: dims.w, naturalH: dims.h });
    } catch (err) {
      console.error('Error downloading poster for PDF:', poster.name, err);
    }
  }));

  // 4. Build the PDF, embedding each (poster, rotated) variant at most once.
  const pdf = await PDFDocument.create();
  const embedCache = new Map<string, PDFImage>();

  async function getEmbeddedImage(posterId: string, rotate: boolean): Promise<PDFImage | null> {
    const key = `${posterId}:${rotate}`;
    const existing = embedCache.get(key);
    if (existing) return existing;

    const cached = imageCache.get(posterId);
    if (!cached) return null;

    let bytes = cached.bytes;
    let type = cached.type;
    if (rotate) {
      const rotatedBlob = await rotateImageBlob(new Blob([bytes], { type }));
      bytes = await rotatedBlob.arrayBuffer();
      type = rotatedBlob.type;
    }

    const img = type === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    embedCache.set(key, img);
    return img;
  }

  for (const sheet of allSheets) {
    const page = pdf.addPage([SHEET_W_IN * PT_PER_IN, SHEET_H_IN * PT_PER_IN]);

    for (const placement of sheet.placements) {
      const cached = imageCache.get(placement.poster.id);
      if (!cached) continue;

      const imageIsLandscape = cached.naturalW > cached.naturalH;
      const frameIsLandscape = placement.w > placement.h;
      const needsRotate = imageIsLandscape !== frameIsLandscape;

      const img = await getEmbeddedImage(placement.poster.id, needsRotate);
      if (!img) continue;

      const effectiveW = needsRotate ? cached.naturalH : cached.naturalW;
      const effectiveH = needsRotate ? cached.naturalW : cached.naturalH;
      const scale = Math.min(placement.w / effectiveW, placement.h / effectiveH);
      const drawWIn = effectiveW * scale;
      const drawHIn = effectiveH * scale;

      const frameXIn = MARGIN_IN + placement.x;
      const frameYFromTopIn = MARGIN_IN + placement.y;
      const drawXIn = frameXIn + (placement.w - drawWIn) / 2;
      const drawYFromTopIn = frameYFromTopIn + (placement.h - drawHIn) / 2;
      const drawYFromBottomIn = SHEET_H_IN - drawYFromTopIn - drawHIn;

      page.drawImage(img, {
        x: drawXIn * PT_PER_IN,
        y: drawYFromBottomIn * PT_PER_IN,
        width: drawWIn * PT_PER_IN,
        height: drawHIn * PT_PER_IN,
      });
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
