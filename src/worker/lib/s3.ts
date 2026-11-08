import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type { WorkerEnv, PresignInput, ConfirmMediaInput } from '../types';
import { detectImageType, expectedImageTypeForKey, isMediaKey } from './media';
import { logError } from './log';

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

export const ALLOWED_MEDIA_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif'
};

function getStorageConfig(env: WorkerEnv['Bindings']) {
  const endpoint = env.AWS_ENDPOINT_URL_S3;
  const region = env.AWS_REGION;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const bucket = env.OBJECT_STORAGE_BUCKET;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('Object Storage is not configured');
  }

  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

function createS3Client(config: ReturnType<typeof getStorageConfig>) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

let cachedS3: { key: string; client: S3Client } | null = null;

/**
 * Reuses one S3 client per isolate while still invalidating it when the
 * endpoint, region, access key, or bucket changes. Rotating the secret for the
 * same access key requires a new isolate (or a redeploy), which is expected.
 */
function getS3Client(config: ReturnType<typeof getStorageConfig>): S3Client {
  const key = [config.endpoint, config.region, config.accessKeyId, config.bucket].join('|');
  if (!cachedS3 || cachedS3.key !== key) {
    cachedS3 = { key, client: createS3Client(config) };
  }
  return cachedS3.client;
}

function buildPublicUrl(endpoint: string, bucket: string, key: string) {
  const normalizedEndpoint = endpoint.replace(/\/$/, '');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${normalizedEndpoint}/${encodeURIComponent(bucket)}/${encodedKey}`;
}

export async function createPresignedUpload(
  env: WorkerEnv['Bindings'],
  input: PresignInput
) {
  const config = getStorageConfig(env);

  if (!input.fileName || !input.contentType || !Number.isInteger(input.size)) {
    throw new TypeError('File name, content type, and size are required');
  }

  const expectedExt = ALLOWED_MEDIA_TYPES[input.contentType];
  if (!expectedExt) {
    throw new RangeError('Only JPEG, PNG, WebP, and AVIF images are allowed');
  }

  const fileSize = input.size ?? 0;
  if (fileSize < 1 || fileSize > MAX_MEDIA_BYTES) {
    throw new RangeError('Image must be 8 MB or smaller');
  }

  // Sanitize filename: strip user extensions and disallow path traversal / double extensions
  const sanitizedBase = input.fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(-50)
    .replace(/^-+|-+$/g, '') || 'upload';

  const key = `projects/${crypto.randomUUID()}-${sanitizedBase}${expectedExt}`;

  const s3 = getS3Client(config);

  const post = await createPresignedPost(s3, {
    Bucket: config.bucket,
    Key: key,
    Expires: 300,
    Fields: { 'Content-Type': input.contentType },
    Conditions: [
      ['eq', '$Content-Type', input.contentType],
      ['content-length-range', 1, MAX_MEDIA_BYTES]
    ]
  });

  return {
    uploadUrl: post.url,
    fields: post.fields,
    publicUrl: buildPublicUrl(config.endpoint, config.bucket, key),
    key,
    maxBytes: MAX_MEDIA_BYTES
  };
}

/**
 * Reads the first bytes of the uploaded object, verifies that the content
 * matches the canonical extension, and deletes the object when it does not.
 */
export async function confirmUploadedMedia(
  env: WorkerEnv['Bindings'],
  input: ConfirmMediaInput
) {
  const key = input.key?.trim();
  if (!key || !isMediaKey(key)) {
    throw new TypeError('Invalid media key');
  }

  const expectedType = expectedImageTypeForKey(key);
  if (!expectedType) {
    throw new RangeError('Unsupported media type');
  }

  const config = getStorageConfig(env);
  const s3 = getS3Client(config);

  const object = await s3.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Range: 'bytes=0-31'
    })
  );

  if (!object.Body) {
    throw new Error('Uploaded object is empty');
  }

  const body = object.Body as unknown as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };

  const bytes = body.transformToByteArray
    ? await body.transformToByteArray()
    : new Uint8Array(await new Response(object.Body as BodyInit).arrayBuffer());

  const detectedType = detectImageType(bytes);
  if (detectedType !== expectedType) {
    await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key })).catch((error) => {
      logError('media_invalid_delete_failed', error, { key });
    });
    throw new RangeError('Uploaded file content does not match its image type');
  }

  return {
    ok: true,
    key,
    contentType: expectedType,
    publicUrl: buildPublicUrl(config.endpoint, config.bucket, key)
  };
}
