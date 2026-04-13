import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 no configurado: definí R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y R2_ACCOUNT_ID (o R2_ENDPOINT completo)."
    );
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return r2Client;
}

function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET?.trim();
  if (!bucket) throw new Error("R2_BUCKET no configurado");
  return bucket;
}

/** URL pública servida por CDN o por la API (proxy). */
function publicFileUrl(objectPath: string): string {
  const cdn = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (cdn) {
    return `${cdn}/${objectPath}`;
  }
  const api = process.env.API_PUBLIC_URL?.replace(/\/$/, "");
  if (api) {
    return `${api}/api/files/${objectPath}`;
  }
  return `/api/files/${objectPath}`;
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
    const api = process.env.API_PUBLIC_URL?.replace(/\/$/, "");
    const rel = `/uploads/local-gcs/${folder}/${fileName}`;
    return api ? `${api}${rel}` : rel;
  }

  const client = getR2Client();
  const bucket = getR2Bucket();
  const body = fs.createReadStream(localPath);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectPath,
      Body: body,
      ContentType: mimeType || "application/octet-stream",
    })
  );

  return publicFileUrl(objectPath);
}

export async function getR2ObjectStream(objectPath: string): Promise<{
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength?: number;
}> {
  const client = getR2Client();
  const bucket = getR2Bucket();
  const out = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: objectPath })
  );
  const body = out.Body;
  if (!body) {
    throw new Error("Objeto vacío");
  }
  const stream =
    body instanceof Readable
      ? body
      : Readable.fromWeb(body as import("stream/web").ReadableStream);
  return {
    stream,
    contentType: out.ContentType || "application/octet-stream",
    contentLength: out.ContentLength,
  };
}

export function deleteLocalFile(localPath: string): void {
  try {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  } catch {
    /* ignore */
  }
}
