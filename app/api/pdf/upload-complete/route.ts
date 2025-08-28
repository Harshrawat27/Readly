import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { incrementPdfUpload } from '@/lib/subscription-utils';
import { canUploadPdf } from '@/lib/subscription-plans';
import { GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { s3Key, fileName, fileSize } = await request.json();

    if (!s3Key || !fileName || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: s3Key, fileName, fileSize' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    console.log(`💾 Completing upload for user: ${userId}`);
    console.log(`🔑 S3 Key: ${s3Key}`);
    console.log(`📁 File: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Download PDF from S3 to detect page count
    console.log(`📄 [Upload-Complete] Downloading PDF from S3 to detect page count...`);
    const s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    let actualPageCount = 1;
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
      });

      const response = await s3Client.send(command);
      const pdfBuffer = Buffer.from(await response.Body!.transformToByteArray());
      
      // Use pdf-lib to avoid bundling issues
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(pdfBuffer);
      actualPageCount = doc.getPageCount();
      console.log(`✅ [Upload-Complete] Detected ${actualPageCount} pages`);
    } catch (error) {
      console.warn('Failed to detect page count, defaulting to 1:', error);
    }

    // Check subscription limits with actual page count and file size
    console.log(`🔍 [Upload-Complete] Checking subscription limits...`);
    
    // Get user's current subscription and PDF count
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        pdfs: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const currentPlan = user.subscriptionPlan || 'free';

    const limitCheck = canUploadPdf(
      user.monthlyPdfsUploaded, 
      user.monthlyPdfsResetDate, 
      fileSize, 
      actualPageCount, 
      currentPlan
    );
    
    if (!limitCheck.allowed) {
      console.log(`❌ [Upload-Complete] Upload blocked: ${limitCheck.reason}`);
      
      // Delete the uploaded file from S3 since we're rejecting it
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: s3Key,
        });
        await s3Client.send(deleteCommand);
        console.log(`🗑️ [Upload-Complete] Deleted rejected file from S3`);
      } catch (deleteError) {
        console.error('Failed to delete rejected file from S3:', deleteError);
      }

      return NextResponse.json(
        { error: limitCheck.reason },
        { status: 403 }
      );
    }

    console.log(`✅ [Upload-Complete] Subscription limits OK for ${currentPlan} plan`);

    // Save PDF info to database
    const pdf = await prisma.pDF.create({
      data: {
        title: fileName.replace('.pdf', ''),
        fileName: fileName,
        fileUrl: s3Key,
        fileSize: fileSize,
        pageCount: actualPageCount,
        userId: userId,
      },
    });

    console.log(`✅ PDF saved to database with ID: ${pdf.id}`);

    // Increment user's monthly and total PDF upload counts
    await incrementPdfUpload(userId, limitCheck.shouldReset);

    console.log(`🎉 Upload completed successfully`);

    return NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      fileName: pdf.fileName,
      uploadedAt: pdf.uploadedAt,
    });

  } catch (error) {
    console.error('❌ Error completing upload:', error);
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}