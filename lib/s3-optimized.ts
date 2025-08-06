// lib/s3-optimized.ts
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const CDN_URL = process.env.CLOUDFRONT_URL; // Optional CloudFront distribution URL

// Cache for signed URLs to avoid regenerating
const urlCache = new Map<string, { url: string; expires: number }>();

export async function uploadPdfToS3(
  file: Buffer,
  fileName: string
): Promise<string> {
  const key = `pdfs/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: 'application/pdf',
    // Add cache headers for CloudFront
    CacheControl: 'max-age=31536000', // 1 year
    Metadata: {
      'uploaded-at': new Date().toISOString(),
    },
  });

  await s3Client.send(command);
  return key;
}

export async function getPdfFromS3(fileUrl: string): Promise<string> {
  // Check cache first
  const cached = urlCache.get(fileUrl);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }

  // If using CloudFront CDN, return CDN URL directly
  if (CDN_URL) {
    const cdnUrl = `${CDN_URL}/${fileUrl}`;
    // Cache for 55 minutes (signed URLs typically expire in 1 hour)
    urlCache.set(fileUrl, {
      url: cdnUrl,
      expires: Date.now() + 55 * 60 * 1000,
    });
    return cdnUrl;
  }

  // Generate presigned URL with longer expiration
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileUrl,
    ResponseCacheControl: 'max-age=3600',
    ResponseContentType: 'application/pdf',
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });

  // Cache the signed URL
  urlCache.set(fileUrl, {
    url: signedUrl,
    expires: Date.now() + 55 * 60 * 1000, // Cache for 55 minutes
  });

  return signedUrl;
}

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of urlCache.entries()) {
    if (value.expires < now) {
      urlCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes
