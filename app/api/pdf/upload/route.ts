import { NextRequest, NextResponse } from 'next/server';
import { uploadPdfToS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { canUploadPdf } from '@/lib/subscription-plans';
import { incrementPdfUpload } from '@/lib/subscription-utils';
// Dynamic import for PDF.js to avoid server-side issues

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📤 Upload request received from user: ${session.user.id}`);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    const fileSizeKB = (file.size / 1024).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📁 File details:`);
    console.log(`   📄 Name: ${file.name}`);
    console.log(`   📊 Size: ${fileSizeKB} KB (${fileSizeMB} MB)`);
    console.log(`   🗂️ Type: ${file.type}`);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const userId = session.user.id;

    // Skip PDF page count for now due to pdfjs-dist server-side issues
    // We'll set a default page count and let the client-side PDF viewer handle the actual count
    const pageCount = 1; // Default fallback

    // Get user data for monthly PDF tracking
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check subscription limits using monthly tracking
    const currentPlan = user.subscriptionPlan || 'free';
    const limitCheck = canUploadPdf(
      user.monthlyPdfsUploaded, 
      user.monthlyPdfsResetDate, 
      file.size, 
      pageCount, 
      currentPlan
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
          requiresUpgrade: true,
        },
        { status: 403 }
      );
    }

    // Upload to S3
    console.log(`☁️ Uploading to S3...`);
    const s3Key = await uploadPdfToS3(fileBuffer, fileName, userId);
    console.log(`✅ S3 upload successful: ${s3Key}`);

    // Save PDF info to database
    console.log(`💾 Saving PDF metadata to database...`);
    const pdf = await prisma.pDF.create({
      data: {
        title: fileName.replace('.pdf', ''),
        fileName: fileName,
        fileUrl: s3Key,
        fileSize: file.size,
        pageCount: pageCount,
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
    console.error('❌ PDF upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}
