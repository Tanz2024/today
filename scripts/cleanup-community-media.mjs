import { Client, Databases, Query } from "node-appwrite";
import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const { APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: project, APPWRITE_API_KEY: key, APPWRITE_DATABASE_ID: database = "brisastory", APPWRITE_COMMUNITY_SUBMISSIONS_COLLECTION_ID: collection = "community_submissions", CLOUDFLARE_ACCOUNT_ID: accountId, R2_BUCKET_NAME: bucket, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
if (!endpoint || !project || !key || !accountId || !bucket || !accessKeyId || !secretAccessKey) throw new Error("Missing Community cleanup environment variables");
const db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(key));
const r2 = new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
const cutoff = Date.now() - 72 * 60 * 60 * 1000;
const referenced = new Set();
for (const status of ["submitted", "in_review", "changes_requested", "published"]) {
  const rows = await db.listDocuments(database, collection, [Query.equal("source", "community"), Query.equal("status", status), Query.limit(500)]);
  for (const row of rows.documents) { if (row.coverObjectKey) referenced.add(row.coverObjectKey); if (row.videoObjectKey) referenced.add(row.videoObjectKey); }
}
let cursor;
let deleted = 0;
do {
  const page = await r2.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "community/pending/", ContinuationToken: cursor }));
  for (const object of page.Contents ?? []) if (object.Key && !referenced.has(object.Key) && object.LastModified && object.LastModified.getTime() < cutoff) { await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key })); deleted += 1; }
  cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (cursor);
console.log(`Deleted ${deleted} orphan Community media objects.`);
