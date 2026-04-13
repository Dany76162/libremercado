import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const storageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  } as any,
  projectId: "",
});

export function getBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID no configurado");
  return storageClient.bucket(bucketId);
}

export async function uploadFileToGCS(
  localPath: string,
  folder: string,
  mimeType: string,
  originalFilename: string
): Promise<string> {
  const ext = path.extname(originalFilename) || "";
  const objectPath = `${folder}/${randomUUID()}${ext}`;

  const useLocal =
    process.env.USE_LOCAL_UPLOADS === "true" ||
    process.env.USE_LOCAL_UPLOADS === "1";

  if (useLocal) {
    const destDir = path.resolve("uploads", "local-gcs", folder);
    fs.mkdirSync(destDir, { recursive: true });
    const fileName = path.basename(objectPath);
    const destPath = path.join(destDir, fileName);
    fs.copyFileSync(localPath, destPath);
    void mimeType;
    return `/uploads/local-gcs/${folder}/${fileName}`;
  }

  const bucket = getBucket();

  await bucket.upload(localPath, {
    destination: objectPath,
    metadata: { contentType: mimeType },
  });

  return `/api/files/${objectPath}`;
}

export function deleteLocalFile(localPath: string): void {
  try {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  } catch {
  }
}
