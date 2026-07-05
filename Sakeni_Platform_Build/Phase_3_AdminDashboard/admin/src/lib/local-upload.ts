const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageFile(file: File, maxBytes = 5 * 1024 * 1024) {
  if (!IMAGE_TYPES.has(file.type)) {
    return "Upload a JPG, PNG, or WebP image.";
  }
  if (file.size > maxBytes) {
    return `Image must be ${(maxBytes / 1024 / 1024).toFixed(0)}MB or smaller.`;
  }
  return "";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be read."));
    img.src = src;
  });
}

export async function imageFileToDataUrl(file: File, maxDimension = 1280, quality = 0.82) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return rawDataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function isSupportedPhotoUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^data:image\//i.test(value);
}
