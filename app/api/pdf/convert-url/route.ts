import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { uploadPdfToS3 } from '@/lib/s3';
import { incrementPdfUpload } from '@/lib/subscription-utils';
import { canUploadPdf } from '@/lib/subscription-plans';
// Import puppeteer conditionally based on environment
async function createBrowser() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const puppeteerCore = await import('puppeteer-core');
    const chromium = await import('@sparticuz/chromium');

    return puppeteerCore.default.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
    });
  } else {
    const puppeteer = await import('puppeteer');

    return puppeteer.default.launch({
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
  }
}

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

    console.log(`🌐 [URL-to-PDF] Starting URL-to-PDF conversion`);
    console.log(`🔗 [URL-to-PDF] URL: ${url}`);
    console.log(`👤 [URL-to-PDF] User: ${session.user.id}`);

    // FIRST: Check current PDF count and subscription limits BEFORE processing
    console.log(`🔍 [URL-to-PDF] Checking user's current PDF count and subscription limits...`);
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        pdfs: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const currentPlan = user.subscriptionPlan || 'free';
    const currentPdfCount = user.pdfs.length;

    console.log(`📊 [URL-to-PDF] User has ${currentPdfCount} PDFs on ${currentPlan} plan`);

    // Check monthly PDF limit first (before page count since we don't know it yet)
    // We'll do a preliminary check with estimated values, then final check after PDF generation
    const preliminaryCheck = canUploadPdf(
      user.monthlyPdfsUploaded, 
      user.monthlyPdfsResetDate, 
      10 * 1024 * 1024, // 10MB estimate
      1, // 1 page estimate
      currentPlan
    );
    
    if (!preliminaryCheck.allowed) {
      console.log(`❌ [URL-to-PDF] Upload blocked by PDF count limit: ${preliminaryCheck.reason}`);
      return NextResponse.json(
        { error: preliminaryCheck.reason },
        { status: 403 }
      );
    }

    console.log(`✅ [URL-to-PDF] Preliminary limits OK, proceeding with PDF generation`);

    // Launch Puppeteer (serverless-optimized for production)
    console.log(`🤖 [URL-to-PDF] Launching Puppeteer browser...`);

    const isProduction = process.env.NODE_ENV === 'production';
    console.log(
      `🔧 [URL-to-PDF] Environment: ${
        isProduction ? 'production (serverless)' : 'development (local)'
      }`
    );

    const browser = await createBrowser();

    let pdfBuffer: Uint8Array;
    let pageTitle = '';

    try {
      console.log(`📄 [URL-to-PDF] Creating new page...`);
      const page = await browser.newPage();

      // Set user agent to avoid being blocked
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      // Set viewport
      await page.setViewport({ width: 1200, height: 800 });

      // Navigate to URL with timeout
      console.log(`🌍 [URL-to-PDF] Navigating to URL...`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Get page title
      pageTitle = await page.title();
      console.log(`📝 [URL-to-PDF] Page title: ${pageTitle}`);

      // Wait a bit for any dynamic content to load
      console.log(`⏳ [URL-to-PDF] Waiting for dynamic content...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate PDF
      console.log(`🖨️ [URL-to-PDF] Generating PDF...`);
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

      const pdfSizeKB = (pdfBuffer.byteLength / 1024).toFixed(2);
      const pdfSizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(2);
      console.log(`✅ [URL-to-PDF] PDF generated successfully!`);
      console.log(
        `📊 [URL-to-PDF] PDF size: ${pdfSizeKB} KB (${pdfSizeMB} MB)`
      );

      // Get EXACT page count using pdf-lib on the generated PDF buffer
      console.log(`📄 [URL-to-PDF] Detecting exact page count from generated PDF...`);
      let actualPageCount = 1;
      try {
        const { PDFDocument } = await import('pdf-lib');
        const doc = await PDFDocument.load(pdfBuffer);
        actualPageCount = doc.getPageCount();
        console.log(`✅ [URL-to-PDF] Detected ${actualPageCount} pages`);
      } catch (error) {
        console.error('❌ [URL-to-PDF] Failed to detect page count from PDF:', error);
        actualPageCount = 1; // Fallback to 1 if we can't detect
      }
      
      // Store the EXACT page count for later use
      (global as { lastGeneratedPdfPageCount?: number }).lastGeneratedPdfPageCount = actualPageCount;
    } finally {
      console.log(`🔐 [URL-to-PDF] Closing browser...`);
      await browser.close();
    }

    // Generate file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const domain = parsedUrl.hostname.replace(/[^a-zA-Z0-9]/g, '-');
    const fileName = `${domain}-${timestamp}.pdf`;

    // Upload to S3 using the same function as local uploads
    console.log(`☁️ [URL-to-PDF] Uploading PDF to S3...`);
    console.log(`📁 [URL-to-PDF] File name: ${fileName}`);

    const fileBuffer = Buffer.from(pdfBuffer);
    
    // Use the page count calculated during PDF generation
    console.log(`📄 [URL-to-PDF] Using calculated page count...`);
    const globalObj = global as { lastGeneratedPdfPageCount?: number };
    const actualPageCount = globalObj.lastGeneratedPdfPageCount || 1;
    console.log(`✅ [URL-to-PDF] Using ${actualPageCount} pages from content analysis`);
    
    // Clean up global variable
    delete globalObj.lastGeneratedPdfPageCount;

    // Final check: subscription limits with actual page count and file size
    console.log(`🔍 [URL-to-PDF] Final validation with actual PDF data...`);
    
    const limitCheck = canUploadPdf(
      user.monthlyPdfsUploaded, 
      user.monthlyPdfsResetDate, 
      pdfBuffer.byteLength, 
      actualPageCount, 
      currentPlan
    );
    
    if (!limitCheck.allowed) {
      console.log(`❌ [URL-to-PDF] Upload blocked: ${limitCheck.reason}`);
      return NextResponse.json(
        { error: limitCheck.reason },
        { status: 403 }
      );
    }

    console.log(`✅ [URL-to-PDF] Subscription limits OK for ${currentPlan} plan`);

    const s3Key = await uploadPdfToS3(fileBuffer, fileName, session.user.id);

    console.log(`✅ [URL-to-PDF] S3 upload successful! S3 key: ${s3Key}`);

    // Save to database
    console.log(`💾 [URL-to-PDF] Saving metadata to database...`);
    const pdf = await prisma.pDF.create({
      data: {
        title: pageTitle || parsedUrl.hostname,
        fileName: fileName,
        fileUrl: s3Key, // Store S3 key in fileUrl field
        fileSize: pdfBuffer.byteLength,
        pageCount: actualPageCount,
        userId: session.user.id,
      },
    });

    console.log(`✅ [URL-to-PDF] PDF saved to database with ID: ${pdf.id}`);

    // Increment user's monthly and total PDF upload counts
    await incrementPdfUpload(session.user.id, limitCheck.shouldReset);

    console.log(
      `🎉 [URL-to-PDF] URL-to-PDF conversion completed successfully!`
    );

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
