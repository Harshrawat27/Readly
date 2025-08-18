import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/aws';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    console.log(`Converting URL to PDF: ${url}`);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    let pdfBuffer: Uint8Array;
    let pageTitle = '';

    try {
      const page = await browser.newPage();

      // Set user agent to avoid being blocked
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      // Set viewport
      await page.setViewport({ width: 1200, height: 800 });

      // Navigate to URL with timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Get page title
      pageTitle = await page.title();

      // Wait a bit for any dynamic content to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate PDF
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });
    } finally {
      await browser.close();
    }

    // Generate file name and key
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const domain = parsedUrl.hostname.replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = `${domain}-${timestamp}.pdf`;
    const s3Key = `pdfs/${session.user.id}/${fileName}`;

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: s3Key,
      Body: Buffer.from(pdfBuffer),
      ContentType: 'application/pdf',
    });

    await s3Client.send(uploadCommand);

    // Save to database
    const pdf = await prisma.pDF.create({
      data: {
        title: pageTitle || parsedUrl.hostname,
        fileName: fileName,
        fileUrl: s3Key, // Store S3 key in fileUrl field
        fileSize: pdfBuffer.byteLength,
        pageCount: null, // Will be updated later when PDF is processed
        userId: session.user.id,
        uploadedAt: new Date(),
        lastAccessedAt: new Date(),
        // sourceUrl: url, // Will add this field to schema later
      },
    });

    console.log(`Successfully converted URL to PDF: ${pdf.id}`);

    return NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      fileName: pdf.fileName,
      message: 'URL converted to PDF successfully',
    });
  } catch (error) {
    console.error('Error converting URL to PDF:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        return NextResponse.json(
          { error: 'Website not found' },
          { status: 400 }
        );
      }
      if (error.message.includes('TimeoutError')) {
        return NextResponse.json(
          { error: 'Website took too long to load' },
          { status: 400 }
        );
      }
      if (error.message.includes('net::ERR_CERT_')) {
        return NextResponse.json(
          { error: 'Website has SSL certificate issues' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          'Failed to convert URL to PDF. Please check the URL and try again.',
      },
      { status: 500 }
    );
  }
}
