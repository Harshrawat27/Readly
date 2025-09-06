import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  canUserPerformAction,
} from '@/lib/subscription-utils';

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

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileSize, fileType } = await request.json();

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, fileType' },
        { status: 400 }
      );
    }

    if (fileType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    
    // console.log(`📝 Generating upload URL for user: ${userId}`);
    // console.log(`📁 File: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Check subscription limits
    const canUpload = await canUserPerformAction(userId, 'upload_pdf', {
      fileSize: fileSize,
      pageCount: 1, // We'll update this after upload
    });

    if (!canUpload.allowed) {
      return NextResponse.json(
        {
          error: canUpload.reason,
          requiresUpgrade: canUpload.requiresUpgrade || false,
        },
        { status: 403 }
      );
    }

    // Generate unique S3 key
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `pdfs/${userId}/${timestamp}-${cleanFileName}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        userId,
        originalFileName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900, // 15 minutes
    });

    // console.log(`✅ Generated presigned URL for: ${s3Key}`);

    return NextResponse.json({
      uploadUrl: presignedUrl,
      s3Key: s3Key,
      expiresIn: 900,
    });

  } catch (error) {
    // console.error('❌ Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}