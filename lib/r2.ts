import "server-only";

import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) throw new Error("R2 is not configured");
  return { bucket, client: new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } }) };
}

export function communityMediaKey(userId: string, mediaId: string, extension: string) {
  return `community/pending/${userId}/${mediaId}.${extension}`;
}

export function communityMediaPublicUrl(key: string) {
  const base = process.env.R2_PUBLIC_URL?.trim();
  return base ? `${base.replace(/\/$/, "")}/${key}` : "";
}

export async function createCommunityUpload(key: string, contentType: string) {
  const { client, bucket } = config();
  return { bucket, url: await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 300 }) };
}

export async function verifyCommunityObject(key: string, maxBytes: number, contentType: string) {
  const { client, bucket } = config();
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return Boolean(head.ContentLength && head.ContentLength <= maxBytes && (!head.ContentType || head.ContentType === contentType));
}

export async function deleteCommunityObject(key: string) {
  const { client, bucket } = config();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
