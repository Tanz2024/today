// Canvas image operations for the Image & Document Studio. Plain pixel maths:
// nothing here is AI, and resizing is ordinary resampling.

export type Crop = { x: number; y: number; w: number; h: number }; // normalised 0–1 of the rotated image
export type Adjust = { brightness: number; contrast: number; saturation: number; grayscale: boolean };
export type Ops = { rotate: 0 | 90 | 180 | 270; flipX: boolean; flipY: boolean; crop: Crop | null; adjust: Adjust; width: number | null };
export type ScanMode = "original" | "gray" | "document";

export const DEFAULT_ADJUST: Adjust = { brightness: 0, contrast: 0, saturation: 0, grayscale: false };
export const DEFAULT_OPS: Ops = { rotate: 0, flipX: false, flipY: false, crop: null, adjust: DEFAULT_ADJUST, width: null };

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** Rotate and flip into a new canvas. */
export function orient(source: CanvasImageSource & { width: number; height: number }, rotate: Ops["rotate"], flipX: boolean, flipY: boolean) {
  const swap = rotate === 90 || rotate === 270;
  const canvas = makeCanvas(swap ? source.height : source.width, swap ? source.width : source.height);
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

/** Brightness/contrast/saturation in −100…100, applied to pixels in place. */
export function adjustPixels(data: Uint8ClampedArray, adjust: Adjust) {
  const b = (adjust.brightness / 100) * 255;
  const c = adjust.contrast;
  const factor = (259 * (c * 2.55 + 255)) / (255 * (259 - c * 2.55));
  const s = 1 + adjust.saturation / 100;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], bl = data[i + 2];
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    if (adjust.grayscale) { r = g = bl = gray; }
    else if (s !== 1) { r = gray + (r - gray) * s; g = gray + (g - gray) * s; bl = gray + (bl - gray) * s; }
    data[i] = factor * (r + b - 128) + 128;
    data[i + 1] = factor * (g + b - 128) + 128;
    data[i + 2] = factor * (bl + b - 128) + 128;
  }
}

export function isDefaultAdjust(adjust: Adjust) {
  return !adjust.brightness && !adjust.contrast && !adjust.saturation && !adjust.grayscale;
}

/** Full pipeline: orient → crop → adjust → resize. */
export function render(source: CanvasImageSource & { width: number; height: number }, ops: Ops, maxSide?: number) {
  let canvas = orient(source, ops.rotate, ops.flipX, ops.flipY);
  if (ops.crop) {
    const { x, y, w, h } = ops.crop;
    const cropped = makeCanvas(canvas.width * w, canvas.height * h);
    cropped.getContext("2d")!.drawImage(canvas, canvas.width * x, canvas.height * y, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    canvas.width = 0;
    canvas = cropped;
  }
  let scale = ops.width ? ops.width / canvas.width : 1;
  // Previews are capped so slider changes stay fast on large photos.
  if (maxSide) scale = Math.min(scale, maxSide / Math.max(canvas.width, canvas.height));
  if (Math.abs(scale - 1) > 0.001) {
    const resized = makeCanvas(canvas.width * scale, canvas.height * scale);
    const ctx = resized.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, resized.width, resized.height);
    canvas.width = 0;
    canvas = resized;
  }
  if (!isDefaultAdjust(ops.adjust)) {
    const ctx = canvas.getContext("2d")!;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    adjustPixels(pixels.data, ops.adjust);
    ctx.putImageData(pixels, 0, 0);
  }
  return canvas;
}

/**
 * Document clean-up for scans: grayscale, then a local-mean threshold that
 * whitens uneven paper and keeps text dark (Bradley–Roth style, integral image).
 */
export function scanFilter(canvas: HTMLCanvasElement, mode: ScanMode) {
  if (mode === "original") return canvas;
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const d = image.data;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; p < gray.length; i += 4, p += 1) gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  if (mode === "gray") {
    let lo = 255, hi = 0;
    for (const v of gray) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const range = Math.max(1, hi - lo);
    for (let i = 0, p = 0; p < gray.length; i += 4, p += 1) d[i] = d[i + 1] = d[i + 2] = ((gray[p] - lo) / range) * 255;
  } else {
    const integral = new Float64Array((width + 1) * (height + 1));
    for (let y = 1; y <= height; y += 1) {
      let row = 0;
      for (let x = 1; x <= width; x += 1) { row += gray[(y - 1) * width + (x - 1)]; integral[y * (width + 1) + x] = integral[(y - 1) * (width + 1) + x] + row; }
    }
    const half = Math.max(8, Math.round(Math.max(width, height) / 32));
    for (let y = 0; y < height; y += 1) {
      const y0 = Math.max(0, y - half), y1 = Math.min(height, y + half + 1);
      for (let x = 0; x < width; x += 1) {
        const x0 = Math.max(0, x - half), x1 = Math.min(width, x + half + 1);
        const sum = integral[y1 * (width + 1) + x1] - integral[y0 * (width + 1) + x1] - integral[y1 * (width + 1) + x0] + integral[y0 * (width + 1) + x0];
        const mean = sum / ((x1 - x0) * (y1 - y0));
        const v = gray[y * width + x] < mean * 0.88 ? Math.max(0, gray[y * width + x] * 0.6) : 255;
        const i = (y * width + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("This browser couldn't encode that format."))), type, quality));
}

export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
