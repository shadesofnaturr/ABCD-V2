import {
  PDFDocument,
  PDFImage,
  PDFPage,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
} from 'pdf-lib';
import JSZip from 'jszip';
import { DriveFile } from './api';

// --- Print sizes, in inches (matches the print-shop layout spec exactly) ---
interface PrintSizeDef {
  key: string;
  widthIn: number;
  heightIn: number;
}

const PRINT_SIZES: Record<string, PrintSizeDef> = {
  A4: { key: 'A4', widthIn: 8.27, heightIn: 11.69 },
  A5: { key: 'A5', widthIn: 6, heightIn: 8.2 },
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

// Crop/trim marks are only drawn for these sizes, matching the reference layouts.
const CROP_MARK_SIZES = new Set(['A4', 'A5']);
const CROP_MARK_HALF_LEN_IN = 0.25;
const CROP_MARK_COLOR = rgb(0.45, 0.45, 0.45);
const CROP_MARK_THICKNESS = 1.5;
// Minimum clear gap between a crop mark and the nearest poster edge. Only
// applied on the generous-margin side (where there's room for it) — the
// tight 0.25in margins on the other sides can't fit a mark plus this gap.
const CROP_MARK_CLEARANCE_IN = 0.25;

interface Orientation {
  w: number;
  h: number;
}

interface PrintJob {
  poster: DriveFile;
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
    { w: size.widthIn, h: size.heightIn },
    { w: size.heightIn, h: size.widthIn },
  ];
}

function gridCapacity(w: number, h: number): number {
  const cols = Math.floor((USABLE_W_IN + GAP_IN) / (w + GAP_IN) + EPS_IN);
  const rows = Math.floor((USABLE_H_IN + GAP_IN) / (h + GAP_IN) + EPS_IN);
  if (cols <= 0 || rows <= 0) return 0;
  return cols * rows;
}

function bestOrientation(size: PrintSizeDef): { orientation: Orientation; cols: number; rows: number; capacity: number } {
  let best: { orientation: Orientation; cols: number; rows: number; capacity: number } | null = null;
  for (const orientation of orientationsOf(size)) {
    const cols = Math.floor((USABLE_W_IN + GAP_IN) / (orientation.w + GAP_IN) + EPS_IN);
    const rows = Math.floor((USABLE_H_IN + GAP_IN) / (orientation.h + GAP_IN) + EPS_IN);
    const capacity = gridCapacity(orientation.w, orientation.h);
    if (!best || capacity > best.capacity) {
      best = { orientation, cols, rows, capacity };
    }
  }
  return best!;
}

// Every size gets its own dedicated PDF, so there's no cross-size mixing to
// solve — just tile same-size jobs into a grid, one sheet at a time, letting
// the final sheet end up partially filled if the count doesn't divide evenly.
function packSingleSize(jobs: PrintJob[], sizeKey: string): SheetPlan[] {
  const sizeDef = PRINT_SIZES[sizeKey];
  const { orientation, cols, rows, capacity } = bestOrientation(sizeDef);
  if (capacity === 0) {
    throw new Error(`Size "${sizeKey}" (${sizeDef.widthIn}x${sizeDef.heightIn}in) doesn't fit the ${SHEET_W_IN}x${SHEET_H_IN}in sheet at all.`);
  }

  const sheets: SheetPlan[] = [];
  for (let start = 0; start < jobs.length; start += capacity) {
    const batch = jobs.slice(start, start + capacity);
    const placements: Placement[] = batch.map((job, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      return {
        poster: job.poster,
        x: c * (orientation.w + GAP_IN),
        y: r * (orientation.h + GAP_IN),
        w: orientation.w,
        h: orientation.h,
      };
    });
    sheets.push({ placements });
  }
  return sheets;
}

// Draws crop/trim marks for an evenly-spaced cols x rows grid: a "+" crosshair
// wherever four cells meet internally, and a short tick wherever a single
// internal divider meets the outer edge of the grid. Purely a visual overlay
// in the margin/gap space — doesn't touch the placement geometry at all.
function drawCropMarks(page: PDFPage, cols: number, rows: number, cellW: number, cellH: number) {
  const colBoundaryXIn = (b: number): number => {
    if (b === 0) return MARGIN_IN;
    if (b === cols) return MARGIN_IN + cols * cellW + (cols - 1) * GAP_IN;
    return MARGIN_IN + b * cellW + (b - 0.5) * GAP_IN;
  };
  const rowBoundaryYFromTopIn = (b: number): number => {
    if (b === 0) return MARGIN_IN;
    if (b === rows) return MARGIN_IN + rows * cellH + (rows - 1) * GAP_IN;
    return MARGIN_IN + b * cellH + (b - 0.5) * GAP_IN;
  };
  const toPdfY = (yFromTopIn: number) => (SHEET_H_IN - yFromTopIn) * PT_PER_IN;
  const toPdfX = (xIn: number) => xIn * PT_PER_IN;

  const drawVerticalTick = (xIn: number, yFromTopIn: number, halfLenIn: number = CROP_MARK_HALF_LEN_IN) => {
    page.drawLine({
      start: { x: toPdfX(xIn), y: toPdfY(yFromTopIn - halfLenIn) },
      end: { x: toPdfX(xIn), y: toPdfY(yFromTopIn + halfLenIn) },
      thickness: CROP_MARK_THICKNESS,
      color: CROP_MARK_COLOR,
    });
  };
  const drawHorizontalTick = (xIn: number, yFromTopIn: number) => {
    page.drawLine({
      start: { x: toPdfX(xIn - CROP_MARK_HALF_LEN_IN), y: toPdfY(yFromTopIn) },
      end: { x: toPdfX(xIn + CROP_MARK_HALF_LEN_IN), y: toPdfY(yFromTopIn) },
      thickness: CROP_MARK_THICKNESS,
      color: CROP_MARK_COLOR,
    });
  };
  const drawCrosshair = (xIn: number, yFromTopIn: number) => {
    drawVerticalTick(xIn, yFromTopIn);
    drawHorizontalTick(xIn, yFromTopIn);
  };

  const clearOffsetIn = CROP_MARK_CLEARANCE_IN + CROP_MARK_HALF_LEN_IN;

  // Single column stacked vertically (e.g. A4, 1x2): there's no column divider
  // to cross, so marks go only on the right edge (the side with leftover
  // space) — tick at the top corner, plus at each interior row divider (its
  // vertical position stays the exact midpoint between the two posters), tick
  // at the bottom corner. All three share the same X so they line up as one
  // straight vertical line down the page.
  if (cols === 1 && rows > 1) {
    const x = colBoundaryXIn(cols) + CROP_MARK_CLEARANCE_IN;
    drawVerticalTick(x, rowBoundaryYFromTopIn(0));
    drawVerticalTick(x, rowBoundaryYFromTopIn(rows));
    for (let r = 1; r < rows; r++) {
      drawCrosshair(x, rowBoundaryYFromTopIn(r));
    }
    return;
  }

  // Mirror of the above for a single row of columns: marks go on the bottom edge only.
  if (rows === 1 && cols > 1) {
    const y = rowBoundaryYFromTopIn(rows);
    drawHorizontalTick(colBoundaryXIn(0), y);
    drawHorizontalTick(colBoundaryXIn(cols), y);
    for (let b = 1; b < cols; b++) {
      drawCrosshair(colBoundaryXIn(b), y);
    }
    return;
  }

  // General cols x rows grid (e.g. A5, 2x2): tick where an internal column
  // divider meets the TOP of the grid, but a crosshair where it meets the
  // BOTTOM (matches the reference — top and bottom aren't symmetric here).
  // Left/right edges (where an internal row divider meets them) stay ticks.
  for (let b = 1; b < cols; b++) {
    const x = colBoundaryXIn(b);
    drawVerticalTick(x, rowBoundaryYFromTopIn(0));
    // Shifted below the poster's edge so the mark doesn't overlap it.
    drawCrosshair(x, rowBoundaryYFromTopIn(rows) + clearOffsetIn);
  }
  for (let r = 1; r < rows; r++) {
    const y = rowBoundaryYFromTopIn(r);
    drawHorizontalTick(colBoundaryXIn(0), y);
    drawHorizontalTick(colBoundaryXIn(cols), y);
  }
  // Bottom-left and bottom-right corner ticks, mirroring the top-center tick.
  drawVerticalTick(colBoundaryXIn(0), rowBoundaryYFromTopIn(rows));
  drawVerticalTick(colBoundaryXIn(cols), rowBoundaryYFromTopIn(rows));
  for (let b = 1; b < cols; b++) {
    for (let r = 1; r < rows; r++) {
      drawCrosshair(colBoundaryXIn(b), rowBoundaryYFromTopIn(r));
    }
  }
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

async function fetchImageCache(posters: DriveFile[]): Promise<Map<string, CachedImage>> {
  const imageCache = new Map<string, CachedImage>();
  await Promise.all(posters.map(async (poster) => {
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
  return imageCache;
}

// Builds one PDF (all sheets for a single size) from a pre-fetched image cache.
async function renderPdf(sheets: SheetPlan[], imageCache: Map<string, CachedImage>, sizeKey: string): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const embedCache = new Map<string, PDFImage>();

  const cropMarks = CROP_MARK_SIZES.has(sizeKey) ? bestOrientation(PRINT_SIZES[sizeKey]) : null;

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

  for (const sheet of sheets) {
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
      // Fill the whole frame regardless of the image's own aspect ratio —
      // scale by the larger ratio so both dimensions cover the frame, then
      // clip to the frame so whatever overflows is cropped away, not shown.
      const scale = Math.max(placement.w / effectiveW, placement.h / effectiveH);
      const drawWIn = effectiveW * scale;
      const drawHIn = effectiveH * scale;

      const frameXIn = MARGIN_IN + placement.x;
      const frameYFromTopIn = MARGIN_IN + placement.y;
      const drawXIn = frameXIn + (placement.w - drawWIn) / 2;
      const drawYFromTopIn = frameYFromTopIn + (placement.h - drawHIn) / 2;
      const drawYFromBottomIn = SHEET_H_IN - drawYFromTopIn - drawHIn;

      const frameXPt = frameXIn * PT_PER_IN;
      const frameYFromBottomPt = (SHEET_H_IN - frameYFromTopIn - placement.h) * PT_PER_IN;
      const frameWPt = placement.w * PT_PER_IN;
      const frameHPt = placement.h * PT_PER_IN;

      page.pushOperators(
        pushGraphicsState(),
        moveTo(frameXPt, frameYFromBottomPt),
        lineTo(frameXPt + frameWPt, frameYFromBottomPt),
        lineTo(frameXPt + frameWPt, frameYFromBottomPt + frameHPt),
        lineTo(frameXPt, frameYFromBottomPt + frameHPt),
        closePath(),
        clip(),
        endPath(),
      );

      page.drawImage(img, {
        x: drawXIn * PT_PER_IN,
        y: drawYFromBottomIn * PT_PER_IN,
        width: drawWIn * PT_PER_IN,
        height: drawHIn * PT_PER_IN,
      });

      page.pushOperators(popGraphicsState());
    }

    if (cropMarks) {
      drawCropMarks(page, cropMarks.cols, cropMarks.rows, cropMarks.orientation.w, cropMarks.orientation.h);
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export interface OrderLine {
  poster: DriveFile;
  size: string;
  quantity: number;
}

// Builds one PDF per distinct size present in the order (all A4 together, all
// A5 together, etc.) and bundles them into a single downloadable zip.
export async function buildOrderPdfZip(lines: OrderLine[]): Promise<Blob> {
  const jobsBySize = new Map<string, PrintJob[]>();
  for (const line of lines) {
    const sizeKey = PRINT_SIZES[line.size] ? line.size : PRINT_SIZE_KEYS[0];
    if (line.quantity <= 0) continue;
    const list = jobsBySize.get(sizeKey) || [];
    for (let i = 0; i < line.quantity; i++) list.push({ poster: line.poster });
    jobsBySize.set(sizeKey, list);
  }
  if (jobsBySize.size === 0) {
    throw new Error('No posters to lay out into a PDF');
  }

  const sheetsBySize = new Map<string, SheetPlan[]>();
  const uniquePosters = new Map<string, DriveFile>();
  for (const [sizeKey, jobs] of jobsBySize) {
    const sheets = packSingleSize(jobs, sizeKey);
    sheetsBySize.set(sizeKey, sheets);
    for (const sheet of sheets) {
      for (const placement of sheet.placements) {
        uniquePosters.set(placement.poster.id, placement.poster);
      }
    }
  }

  // Fetch every unique poster image once, shared across all the per-size PDFs.
  const imageCache = await fetchImageCache(Array.from(uniquePosters.values()));

  const zip = new JSZip();
  for (const [sizeKey, sheets] of sheetsBySize) {
    const blob = await renderPdf(sheets, imageCache, sizeKey);
    const safeName = sizeKey.replace(/[\\/:*?"<>|]/g, '-');
    zip.file(`${safeName}.pdf`, blob);
  }

  return zip.generateAsync({ type: 'blob' });
}
