export type MediaShape = "panorama" | "landscape" | "square" | "portrait" | "tall";

export function getMediaShape(width: number, height: number): MediaShape {
  if (!width || !height) return "landscape";
  const ratio = width / height;
  if (ratio >= 1.8) return "panorama";
  if (ratio >= 1.15) return "landscape";
  if (ratio >= 0.9) return "square";
  if (ratio >= 0.67) return "portrait";
  return "tall";
}

export function getMediaLayout(shape: MediaShape) {
  switch (shape) {
    case "panorama": return { frame: "w-full", image: "w-full max-h-[72vh] object-cover" };
    case "landscape": return { frame: "w-full", image: "w-full max-h-[76vh] object-cover" };
    case "square": return { frame: "mx-auto w-full max-w-[680px]", image: "h-auto w-full object-cover" };
    case "portrait": return { frame: "mx-auto w-full max-w-[560px]", image: "h-auto max-h-[78vh] w-full object-contain" };
    case "tall": return { frame: "mx-auto w-full max-w-[480px]", image: "h-auto max-h-[78vh] w-full object-contain" };
  }
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unable to read this image.")); };
    image.src = url;
  });
}
