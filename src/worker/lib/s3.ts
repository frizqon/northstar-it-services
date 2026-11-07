import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type { WorkerEnv, PresignInput } from '../types';

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

export const ALLOWED_MEDIA_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif'
};

export async function createPresignedUpload(
  env: WorkerEnv['Bindings'],
  input: PresignInput
) {
  if (
    !env.AWS_ENDPOINT_URL_S3 ||
    !env.AWS_REGION ||
    !env.AWS_ACCESS_KEY_ID ||
    !env.AWS_SECRET_ACCESS_KEY ||
    !env.OBJECT_STORAGE_BUCKET
  ) {
    throw new Error('Object Storage is not configured');
  }

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

  const s3 = new S3Client({
    endpoint: env.AWS_ENDPOINT_URL_S3,
    region: env.AWS_REGION,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
  });

  const post = await createPresignedPost(s3, {
    Bucket: env.OBJECT_STORAGE_BUCKET,
    Key: key,
    Expires: 300,
    Fields: { 'Content-Type': input.contentType },
    Conditions: [
      ['eq', '$Content-Type', input.contentType],
      ['content-length-range', 1, MAX_MEDIA_BYTES]
    ]
  });

  const endpoint = env.AWS_ENDPOINT_URL_S3.replace(/\/$/, '');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');

  return {
    uploadUrl: post.url,
    fields: post.fields,
    publicUrl: `${endpoint}/${encodeURIComponent(env.OBJECT_STORAGE_BUCKET)}/${encodedKey}`,
    key,
    maxBytes: MAX_MEDIA_BYTES
  };
}
