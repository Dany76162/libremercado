import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import crypto from "crypto";

const UPLOAD_ROOT = path.resolve("uploads");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function buildStorage(subfolder: string) {
  const dest = path.join(UPLOAD_ROOT, subfolder);
  ensureDir(dest);

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      const name = crypto.randomBytes(16).toString("hex") + ext;
      cb(null, name);
    },
  });
}

function buildUploader(subfolder: string, fieldName = "image") {
  return multer({
    storage: buildStorage(subfolder),
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter: (_req: Request, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Tipo de archivo no permitido. Solo JPG, PNG, WEBP o GIF."));
      }
    },
  }).single(fieldName);
}

export const uploadProduct = buildUploader("products");
export const uploadStore = buildUploader("stores");
export const uploadAvatar = buildUploader("avatars");
export const uploadKyc = buildUploader("kyc");
export const uploadPromo = buildUploader("promos");

const VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/avi",
  "video/x-msvideo",
]);
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

export const uploadVideo = multer({
  storage: buildStorage("videos"),
  limits: { fileSize: MAX_VIDEO_SIZE_BYTES },
  fileFilter: (_req: Request, file, cb) => {
    if (VIDEO_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido. Solo MP4, WEBM, MOV o AVI."));
    }
  },
}).single("video");

export const uploadThumbnail = buildUploader("thumbnails");

const INSTITUCIONAL_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
]);
const MAX_INSTITUCIONAL_SIZE = 200 * 1024 * 1024; // 200 MB

export const uploadInstitucional = multer({
  storage: buildStorage("institucional"),
  limits: { fileSize: MAX_INSTITUCIONAL_SIZE },
  fileFilter: (_req: Request, file, cb) => {
    if (INSTITUCIONAL_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido. Solo imágenes (JPG, PNG, WEBP) o videos (MP4, WEBM, MOV)."));
    }
  },
}).single("file");

export function getPublicUrl(subfolder: string, filename: string): string {
  return `/uploads/${subfolder}/${filename}`;
}

const IMAGE_MAGIC_SIGNATURES = [
  { bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { bytes: [0x47, 0x49, 0x46], offset: 0 },
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
] as const;

const VIDEO_MAGIC_SIGNATURES = [
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { bytes: [0x1a, 0x45, 0xdf, 0xa3], offset: 0 },
  { bytes: [0x66, 0x72, 0x65, 0x65], offset: 4 },
  { bytes: [0x6d, 0x64, 0x61, 0x74], offset: 4 },
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
] as const;

function matchesSig(buf: Buffer, bytes: readonly number[], offset: number): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

export function validateFileMagicBytes(
  filePath: string,
  allowImages: boolean,
  allowVideos: boolean
): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);

    if (allowImages) {
      for (const sig of IMAGE_MAGIC_SIGNATURES) {
        if (matchesSig(buf, sig.bytes, sig.offset)) return true;
      }
    }
    if (allowVideos) {
      for (const sig of VIDEO_MAGIC_SIGNATURES) {
        if (matchesSig(buf, sig.bytes, sig.offset)) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function deleteUploadedFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}
