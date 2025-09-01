'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { getPdfPageCount } from '@/utils/getPdfPageCount';
import Toast from '@/components/Toast';

export default function UploadPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  
  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/signin');
    }
  }, [session, isPending, router]);

  const processPdfFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setToastMessage('Please select a valid PDF file.');
      setToastType('error');
      setShowToast(true);
      return false;
    }

    const fileSizeKB = (file.size / 1024).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📁 Attempting to upload file: ${file.name}`);
    console.log(`📊 File size: ${fileSizeKB} KB (${fileSizeMB} MB)`);

    if (file.size > 100 * 1024 * 1024) { // 100MB limit (reasonable for PDFs)
      setToastMessage('File size must be less than 100MB.');
      setToastType('error');
      setShowToast(true);
      return false;
    }

    setIsUploading(true);
    setUploadProgress('Checking PDF...');

    try {
      // Step 1: Check page count locally before doing anything
      console.log(`📄 Checking PDF page count...`);
      let pageCount;
      try {
        pageCount = await getPdfPageCount(file);
        console.log(`✅ PDF has ${pageCount} pages`);
      } catch (pageCountError) {
        console.error('❌ Error checking PDF page count:', pageCountError);
        setIsUploading(false);
        setUploadProgress('');
        setToastMessage('Failed to read PDF file. Please make sure it\'s a valid PDF.');
        setToastType('error');
        setShowToast(true);
        return false;
      }
      
      // For this simple upload page, we could add basic limits here
      // For now, we'll let the server handle the subscription limits
      console.log(`🔗 Using direct S3 upload with ${pageCount} pages`);

      setUploadProgress('Preparing upload...');

      // Step 2: Get presigned upload URL
      console.log(`🔑 Requesting presigned upload URL...`);
      const urlResponse = await fetch('/api/pdf/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { uploadUrl, s3Key } = await urlResponse.json();
      console.log(`✅ Got presigned URL for S3 key: ${s3Key}`);

      // Step 2: Upload directly to S3
      setUploadProgress('Uploading to S3...');
      console.log(`☁️ Uploading directly to S3...`);

      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!s3Response.ok) {
        throw new Error(`S3 upload failed: ${s3Response.status} ${s3Response.statusText}`);
      }

      console.log(`✅ S3 upload successful!`);

      // Step 3: Complete upload (save metadata to database)
      setUploadProgress('Finalizing upload...');
      console.log(`💾 Saving metadata to database...`);

      const completeResponse = await fetch('/api/pdf/upload-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          s3Key: s3Key,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || 'Failed to complete upload');
      }

      const result = await completeResponse.json();
      setUploadProgress('Upload successful!');
      console.log(`🎉 Upload completed! PDF ID: ${result.id}`);
      
      // Redirect to the PDF view page after a short delay
      setTimeout(() => {
        router.push(`/pdf/${result.id}`);
      }, 1000);

      return true;
    } catch (error) {
      console.error('❌ Error uploading PDF:', error);
      setToastMessage(error instanceof Error ? error.message : 'Error uploading PDF file. Please try again.');
      setToastType('error');
      setShowToast(true);
      setUploadProgress('');
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [router]);

  const handleFileSelect = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = false;
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await processPdfFile(file);
      }
    };
    
    input.click();
  }, [processPdfFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      await processPdfFile(pdfFile);
    } else {
      setToastMessage('Please drop a valid PDF file.');
      setToastType('error');
      setShowToast(true);
    }
  }, [processPdfFile]);

  const handleSignOut = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/signin');
          },
        },
      });
    } catch (error) {
      console.error('Sign out error:', error);
      router.push('/signin');
    }
  };

  if (isPending) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[var(--background)]'>
        <div className='text-center space-y-4'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto'></div>
          <p className='text-[var(--text-muted)] text-sm'>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[var(--background)]'>
        <div className='text-center space-y-4'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto'></div>
          <p className='text-[var(--text-muted)] text-sm'>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[var(--background)] text-[var(--text-primary)]'>
      {/* Header */}
      <div className='border-b border-[var(--border)] bg-[var(--card-background)]'>
        <div className='max-w-4xl mx-auto px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center'>
                <svg
                  className='w-5 h-5 text-white'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                  <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
                </svg>
              </div>
              <h1 className='text-xl font-semibold'>Readly</h1>
            </div>
            
            <div className='flex items-center gap-4'>
              <button
                onClick={() => router.push('/')}
                className='text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors'
              >
                Back to Home
              </button>
              
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center'>
                  <span className='text-white text-sm font-medium'>
                    {session.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className='text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors'
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-4xl mx-auto px-6 py-12'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold mb-4'>Upload a PDF</h2>
          <p className='text-[var(--text-muted)] text-lg'>
            Upload your PDF document to start chatting with it using AI
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragOver
              ? 'border-[var(--accent)] bg-[var(--accent)]/10'
              : 'border-[var(--border)] hover:border-[var(--accent)]/50'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className='space-y-4'>
              <div className='w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto'></div>
              <p className='text-lg font-medium'>{uploadProgress}</p>
            </div>
          ) : (
            <div className='space-y-6'>
              <div className='w-16 h-16 bg-[var(--faded-white)] rounded-full mx-auto flex items-center justify-center'>
                <svg
                  className='w-8 h-8 text-[var(--text-muted)]'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                  <polyline points='17,8 12,3 7,8' />
                  <line x1='12' y1='3' x2='12' y2='15' />
                </svg>
              </div>
              
              <div>
                <h3 className='text-xl font-semibold mb-2'>
                  Drop your PDF here, or{' '}
                  <button
                    onClick={handleFileSelect}
                    className='text-[var(--accent)] hover:underline'
                  >
                    browse files
                  </button>
                </h3>
                <p className='text-[var(--text-muted)]'>
                  Supports PDF files up to 100MB
                </p>
              </div>
              
              <button
                onClick={handleFileSelect}
                className='bg-[var(--accent)] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity'
              >
                Select PDF File
              </button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className='mt-16 grid grid-cols-1 md:grid-cols-3 gap-8'>
          <div className='text-center'>
            <div className='w-12 h-12 bg-[var(--accent)]/10 rounded-full mx-auto mb-4 flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-[var(--accent)]'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M21 15v4a2 2 0 0 1-2 2H7l-4-4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                <path d='M17 8h-8' />
                <path d='M17 12h-8' />
                <path d='M17 16h-2' />
              </svg>
            </div>
            <h4 className='font-semibold mb-2'>AI-Powered Chat</h4>
            <p className='text-[var(--text-muted)] text-sm'>
              Ask questions about your PDF and get intelligent responses
            </p>
          </div>
          
          <div className='text-center'>
            <div className='w-12 h-12 bg-[var(--accent)]/10 rounded-full mx-auto mb-4 flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-[var(--accent)]'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
              </svg>
            </div>
            <h4 className='font-semibold mb-2'>Text Selection</h4>
            <p className='text-[var(--text-muted)] text-sm'>
              Select text from your PDF to ask specific questions
            </p>
          </div>
          
          <div className='text-center'>
            <div className='w-12 h-12 bg-[var(--accent)]/10 rounded-full mx-auto mb-4 flex items-center justify-center'>
              <svg
                className='w-6 h-6 text-[var(--accent)]'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M12 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2' />
                <path d='M4 14a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6z' />
                <path d='M16 10h-6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h6v-8z' />
              </svg>
            </div>
            <h4 className='font-semibold mb-2'>Secure Storage</h4>
            <p className='text-[var(--text-muted)] text-sm'>
              Your PDFs are securely stored and only accessible to you
            </p>
          </div>
        </div>
      </div>
      
      {/* Toast */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  );
}