import {
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "./client";

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return getPublicUrl(key);
}

export async function deleteFile(key: string) {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}

export function getPublicUrl(key: string) {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
