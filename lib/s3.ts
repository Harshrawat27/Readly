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

// Upload image analysis screenshots to S3
export async function uploadImageToS3(
  imageDataUrl: string,
  userId: string,
  pdfId: string
): Promise<string> {
  // Convert base64 data URL to buffer
  const matches = imageDataUrl.match(/^data:image\/([a-zA-Z]*);base64,(.*)$/);
  if (!matches) {
    throw new Error('Invalid image data URL');
  }

  const imageType = matches[1]; // png, jpeg, etc.
  const base64Data = matches[2];
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Generate unique filename
  const timestamp = Date.now();
  const key = `image-analysis/${userId}/${pdfId}/${timestamp}.${imageType}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: imageBuffer,
    ContentType: `image/${imageType}`,
    Metadata: {
      userId,
      pdfId,
      uploadedAt: new Date().toISOString(),
      type: 'image-analysis',
    },
  });

  try {
    console.log('📤 Uploading image to S3:', {
      bucket: BUCKET_NAME,
      key: key,
      size: imageBuffer.length,
      contentType: `image/${imageType}`,
      region: process.env.AWS_REGION
    });

    await s3Client.send(command);
    
    console.log('✅ Image uploaded successfully to S3');
    
    // Instead of returning the S3 key, return the key so we can generate fresh signed URLs when needed
    // This way we don't have expiring URLs stored in the database
    return key;
  } catch (error) {
    console.error('❌ Error uploading image to S3:', error);
    throw new Error('Failed to upload image to S3');
  }
}

// Get signed URL for image access (if bucket is private)
export async function getImageFromS3(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });
    return signedUrl;
  } catch (error) {
    console.error('Error getting image from S3:', error);
    throw new Error('Failed to get image from S3');
  }
}
