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

export function getPublicUrl(subfolder: string, filename: string): string {
  return `/uploads/${subfolder}/${filename}`;
}
