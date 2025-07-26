import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAEXAMPLE123456789',
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY ||
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'readly-pdfs-bucket';

export async function uploadPdfToS3(
  file: Buffer,
  fileName: string,
  userId: string
): Promise<string> {
  const key = `pdfs/${userId}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: 'application/pdf',
    Metadata: {
      userId,
      uploadedAt: new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    return key;
  } catch (error) {
    console.error('Error uploading PDF to S3:', error);
    throw new Error('Failed to upload PDF to S3');
  }
}

export async function getPdfFromS3(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });
    return signedUrl;
  } catch (error) {
    console.error('Error getting PDF from S3:', error);
    throw new Error('Failed to get PDF from S3');
  }
}

export async function deletePdfFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting PDF from S3:', error);
    throw new Error('Failed to delete PDF from S3');
  }
}
