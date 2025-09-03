'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchWithCache, cacheKeys, clientCache } from '@/lib/clientCache';
import { useSubscription } from '@/hooks/useSubscription';
import { useLimitHandler } from '@/hooks/useLimitHandler';
import LimitReachedPopup from '@/components/LimitReachedPopup';
import { getPdfPageCount } from '@/utils/getPdfPageCount';

interface PDFSidebarProps {
  onPdfSelect: (pdfId: string) => void;
  selectedPdfId: string | null;
  userId: string;
  onSignOut: () => void;
  isSigningOut: boolean;
  userName: string;
  onToggleSidebar: () => void;
  isCollapsed: boolean;
}

interface PDFItem {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: Date;
  lastAccessedAt: Date;
}

interface APIResponsePDFItem {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: string;
  lastAccessedAt: string;
}

const PDFSidebar = ({
  onPdfSelect,
  selectedPdfId,
  userId,
  onSignOut,
  isSigningOut,
  userName,
  onToggleSidebar,
  isCollapsed,
}: PDFSidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [pdfHistory, setPdfHistory] = useState<PDFItem[]>([]);

  // Subscription and limit handling
  const { subscriptionData, handleApiError: handleSubscriptionError } =
    useSubscription();
  const currentPlan = subscriptionData?.plan?.name || 'free';
  const {
    isLimitPopupOpen,
    currentLimitType,
    closeLimitPopup,
    handleUpgrade,
    handlePdfUpload,
    handleApiError: handleLimitError,
  } = useLimitHandler(currentPlan);
  const [isLoadingPdfs, setIsLoadingPdfs] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [urlInput, setUrlInput] = useState('');
  const [isConvertingUrl, setIsConvertingUrl] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to update both cache and state
  const updatePdfList = useCallback(
    (updatedList: PDFItem[]) => {
      // Update state immediately
      setPdfHistory(updatedList);

      // Update cache with the same data
      const cacheKey = cacheKeys.pdfList(userId);
      const cacheData = updatedList.map((pdf) => ({
        id: pdf.id,
        title: pdf.title,
        fileName: pdf.fileName,
        uploadedAt: pdf.uploadedAt.toISOString(),
        lastAccessedAt: pdf.lastAccessedAt.toISOString(),
      }));
      clientCache.set(cacheKey, cacheData, 600); // 10 minute cache
    },
    [userId]
  );

  // Load PDFs with aggressive caching for instant loading
  useEffect(() => {
    const loadInitialPdfs = async () => {
      try {
        setIsLoadingPdfs(true);

        // Use cache with 10 minute TTL - only refresh if data is stale or user explicitly refreshes
        const cacheKey = cacheKeys.pdfList(userId);
        const pdfs = await fetchWithCache<APIResponsePDFItem[]>(
          '/api/pdf/list',
          cacheKey,
          600 // 10 minute cache (600 seconds)
        );

        const processedPdfs = pdfs.map((pdf: APIResponsePDFItem) => ({
          ...pdf,
          uploadedAt: new Date(pdf.uploadedAt),
          lastAccessedAt: new Date(pdf.lastAccessedAt),
        }));

        setPdfHistory(processedPdfs);
      } catch (error) {
        console.error('Error loading PDFs:', error);
        // Fallback to cache if available (even if stale)
        const cachedPdfs = clientCache.get<APIResponsePDFItem[]>(
          cacheKeys.pdfList(userId)
        );
        if (cachedPdfs) {
          const processedPdfs = cachedPdfs.map((pdf: APIResponsePDFItem) => ({
            ...pdf,
            uploadedAt: new Date(pdf.uploadedAt),
            lastAccessedAt: new Date(pdf.lastAccessedAt),
          }));
          setPdfHistory(processedPdfs);
        }
      } finally {
        setIsLoadingPdfs(false);
      }
    };

    loadInitialPdfs();
  }, [userId]); // Depend on userId for cache key

  // No scrolling needed since list doesn't refresh

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }

      // Close PDF action dropdown when clicking outside
      const target = event.target as HTMLElement;
      if (
        !target.closest('.pdf-action-dropdown') &&
        !target.closest('.three-dots')
      ) {
        setActiveDropdownId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Removed automatic refresh on focus/visibility change

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const processPdfFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setToast({
          message: 'Please select a valid PDF file.',
          type: 'error',
        });
        return false;
      }

      const fileSizeKB = (file.size / 1024).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      console.log(`🚀 [PDFSidebar] Starting upload process`);
      console.log(`📁 [PDFSidebar] File: ${file.name}`);
      console.log(`📊 [PDFSidebar] Size: ${fileSizeKB} KB (${fileSizeMB} MB)`);

      setIsUploading(true);
      setUploadProgress('Checking PDF...');

      try {
        // Step 1: Check page count locally before doing anything
        console.log(`📄 [PDFSidebar] Checking PDF page count...`);
        let pageCount;
        try {
          pageCount = await getPdfPageCount(file);
          console.log(`✅ [PDFSidebar] PDF has ${pageCount} pages`);
        } catch (pageCountError) {
          console.error('Error checking PDF page count:', pageCountError);
          setIsUploading(false);
          setUploadProgress('');
          setToast({
            message:
              "Failed to read PDF file. Please make sure it's a valid PDF.",
            type: 'error',
          });
          return false;
        }

        // Step 2: Check subscription limits with actual page count
        const currentPdfCount = pdfHistory.length;
        const uploadSuccess = handlePdfUpload(
          {
            currentPdfCount,
            fileSize: file.size,
            pageCount: pageCount, // Use actual page count
          },
          () => {
            console.log(
              '✅ [PDFSidebar] Subscription limits OK, proceeding with upload'
            );
          }
        );

        if (!uploadSuccess) {
          console.log('❌ [PDFSidebar] Upload blocked by subscription limits');
          setIsUploading(false);
          setUploadProgress('');
          return false;
        }

        console.log(
          `🔗 [PDFSidebar] Using direct S3 upload (bypassing Vercel size limits)`
        );

        setUploadProgress('Preparing upload...');

        // Step 3: Get presigned upload URL
        console.log(`🔑 [PDFSidebar] Requesting presigned upload URL...`);
        setUploadProgress('Getting upload URL...');

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
          console.error(`❌ [PDFSidebar] Failed to get upload URL:`, error);
          throw new Error(error.error || 'Failed to get upload URL');
        }

        const { uploadUrl, s3Key } = await urlResponse.json();
        console.log(`✅ [PDFSidebar] Got presigned URL for S3 key: ${s3Key}`);

        // Step 2: Upload directly to S3
        console.log(`☁️ [PDFSidebar] Uploading directly to S3...`);
        setUploadProgress('Uploading to S3...');

        const s3Response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!s3Response.ok) {
          console.error(
            `❌ [PDFSidebar] S3 upload failed: ${s3Response.status} ${s3Response.statusText}`
          );
          throw new Error(
            `S3 upload failed: ${s3Response.status} ${s3Response.statusText}`
          );
        }

        console.log(`✅ [PDFSidebar] S3 upload successful!`);

        // Step 3: Complete upload (save metadata to database)
        console.log(`💾 [PDFSidebar] Saving metadata to database...`);
        setUploadProgress('Finalizing upload...');

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
          console.error(`❌ [PDFSidebar] Failed to complete upload:`, error);
          throw new Error(error.error || 'Failed to complete upload');
        }

        const result = await completeResponse.json();
        console.log(`✅ [PDFSidebar] Upload completed! PDF ID: ${result.id}`);
        setUploadProgress('Upload successful!');

        // Add new PDF to both state and cache immediately
        const newPdf = {
          id: result.id,
          title: file.name.replace('.pdf', ''), // Use file name as title
          fileName: file.name,
          uploadedAt: new Date(),
          lastAccessedAt: new Date(),
        };

        const updatedList = [newPdf, ...pdfHistory];
        updatePdfList(updatedList);

        // Show success toast
        setToast({
          message: 'PDF uploaded successfully!',
          type: 'success',
        });

        // Navigate to the PDF view page after a short delay
        setTimeout(() => {
          onPdfSelect(result.id);
          router.push(`/pdf/${result.id}`);
        }, 1000);

        return true;
      } catch (error) {
        console.error('Error uploading PDF:', error);

        // Check if it's a limit-related error
        const isLimitError =
          handleLimitError(error) || handleSubscriptionError(error);

        if (!isLimitError) {
          // Only show toast for non-limit errors
          setToast({
            message:
              error instanceof Error
                ? error.message
                : 'Error uploading PDF file. Please try again.',
            type: 'error',
          });
        }

        setUploadProgress('');
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [
      userId,
      onPdfSelect,
      router,
      pdfHistory,
      handlePdfUpload,
      handleLimitError,
      handleSubscriptionError,
      updatePdfList,
    ]
  );

  const handleFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) {
      setToast({ message: 'Please enter a valid URL', type: 'error' });
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      setToast({ message: 'Please enter a valid URL', type: 'error' });
      return;
    }

    // Get real PDF count from server first
    setIsConvertingUrl(true);
    setUploadProgress('Checking limits...');

    try {
      // First, check PDF count limit by getting real count from server
      const pdfListResponse = await fetch('/api/pdf/list');
      if (!pdfListResponse.ok) {
        throw new Error('Failed to get PDF count');
      }
      const currentPdfs = await pdfListResponse.json();
      const currentPdfCount = currentPdfs.length;
      console.log(`📊 [URL Upload] Current PDF count: ${currentPdfCount}`);

      // Check PDF count limit (but not page count yet - we'll get that after conversion)
      const uploadSuccess = handlePdfUpload(
        {
          currentPdfCount,
          fileSize: 10 * 1024 * 1024, // Estimate 10MB for URL conversion
          pageCount: 1, // Don't limit on page count yet - will check after conversion
        },
        () => {
          console.log('✅ [PDFSidebar] PDF count limit OK for URL conversion');
        }
      );

      if (!uploadSuccess) {
        console.log(
          '❌ [PDFSidebar] URL conversion blocked by PDF count limit'
        );
        setIsConvertingUrl(false);
        return;
      }

      setUploadProgress('Converting URL to PDF...');
    } catch (error) {
      console.error('❌ [PDFSidebar] Failed to check PDF count:', error);
      setIsConvertingUrl(false);
      setToast({
        message: 'Failed to check upload limits. Please try again.',
        type: 'error',
      });
      return;
    }

    try {
      const response = await fetch('/api/pdf/convert-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to convert URL to PDF');
      }

      const result = await response.json();

      // Add new PDF to both state and cache immediately
      const newPdf = {
        id: result.id,
        title: result.title || new URL(urlInput).hostname,
        fileName: result.fileName,
        uploadedAt: new Date(),
        lastAccessedAt: new Date(),
      };

      const updatedList = [newPdf, ...pdfHistory];
      updatePdfList(updatedList);

      // Select the new PDF
      onPdfSelect(result.id);

      setToast({
        message: 'URL converted to PDF successfully!',
        type: 'success',
      });
      setUrlInput(''); // Clear the input
      setUploadProgress(''); // Clear progress
    } catch (error) {
      console.error('Error converting URL to PDF:', error);

      // Check if it's a limit-related error
      const isLimitError =
        handleLimitError(error) || handleSubscriptionError(error);

      if (!isLimitError) {
        // Only show toast for non-limit errors
        setToast({
          message:
            error instanceof Error
              ? error.message
              : 'Failed to convert URL to PDF',
          type: 'error',
        });
      }
    } finally {
      setIsConvertingUrl(false);
      setUploadProgress(''); // Clear progress in all cases
    }
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await processPdfFile(file);
      }
      // Reset the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processPdfFile]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const pdfFile = files.find((file) => file.type === 'application/pdf');

      if (pdfFile) {
        await processPdfFile(pdfFile);
      } else {
        setToast({
          message: 'Please drop a valid PDF file.',
          type: 'error',
        });
      }
    },
    [processPdfFile]
  );

  // const formatDate = (date: Date) => {
  //   // eslint-disable-line @typescript-eslint/no-unused-vars
  //   return date.toLocaleDateString('en-US', {
  //     month: 'short',
  //     day: 'numeric',
  //     year: 'numeric',
  //   });
  // };

  const handleRename = async () => {
    if (!renameId || !renameValue.trim()) return;

    const newTitle = renameValue.trim();
    const oldTitle = pdfHistory.find((pdf) => pdf.id === renameId)?.title || '';

    // Optimistic update - update both state and cache immediately
    const updatedList = pdfHistory.map((pdf) =>
      pdf.id === renameId ? { ...pdf, title: newTitle } : pdf
    );
    updatePdfList(updatedList);

    // Close dialog immediately
    setRenameId(null);
    setRenameValue('');

    try {
      const response = await fetch(`/api/pdf/${renameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename');
      }

      setToast({
        message: 'PDF renamed successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error renaming PDF:', error);

      // Rollback both state and cache on error
      const revertedList = pdfHistory.map((pdf) =>
        pdf.id === renameId ? { ...pdf, title: oldTitle } : pdf
      );
      updatePdfList(revertedList);

      // Show error toast
      setToast({
        message: 'Sorry we failed to rename your file, try again',
        type: 'error',
      });
    }
  };

  return (
    <div className='h-full flex relative'>
      {/* Icon Sidebar - Only when collapsed */}
      {isCollapsed && (
        <div className='h-full w-16 bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col relative z-20'>
          {/* Header with Logo */}
          <div className='p-3 border-b border-[var(--border)]'>
            <button
              onClick={onToggleSidebar}
              className='w-8 h-8 bg-[var(--accent)] rounded-md flex items-center justify-center mx-auto hover:opacity-90 transition-opacity'
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
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
            </button>
          </div>

          {/* Navigation Icons */}
          <div className='flex-1 flex flex-col py-4'>
            {/* New Chat */}
            <button
              onClick={handleFileSelect}
              disabled={isUploading}
              className='w-10 h-10 mx-3 mb-2 bg-[var(--accent)] text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50'
              title='New PDF'
            >
              {isUploading ? (
                <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              ) : (
                <svg
                  className='w-5 h-5'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M12 5v14' />
                  <path d='M5 12h14' />
                </svg>
              )}
            </button>

            {/* PDFs Icon */}
            <button
              className='w-10 h-10 mx-3 mb-2 rounded-lg flex items-center justify-center hover:bg-[var(--faded-white)] transition-colors text-[var(--text-muted)]'
              title='PDFs'
            >
              <svg
                className='w-5 h-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
                <polyline points='22,4 12,14.01 9,11.01' />
              </svg>
            </button>

            {/* Projects Icon */}
            <button
              className='w-10 h-10 mx-3 mb-2 rounded-lg flex items-center justify-center hover:bg-[var(--faded-white)] transition-colors text-[var(--text-muted)]'
              title='Projects'
            >
              <svg
                className='w-5 h-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z' />
                <path d='M8 5v6' />
                <path d='M16 5v6' />
              </svg>
            </button>

            {/* Artifacts/Settings Icon */}
            <button
              className='w-10 h-10 mx-3 mb-2 rounded-lg flex items-center justify-center hover:bg-[var(--faded-white)] transition-colors text-[var(--text-muted)]'
              title='Settings'
            >
              <svg
                className='w-5 h-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='3' />
                <path d='m12 1 0 6m0 6 0 6m11-7-6 0m-6 0-6 0' />
              </svg>
            </button>
          </div>

          {/* User Avatar */}
          <div
            className='p-3 border-t border-[var(--border)] relative'
            ref={dropdownRef}
          >
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className='w-8 h-8 bg-[var(--text-primary)] rounded-full flex items-center justify-center mx-auto text-white text-sm font-medium hover:opacity-90 transition-opacity'
              title={userName}
            >
              {userName.charAt(0).toUpperCase()}
            </button>

            {/* User Dropdown for Icon State */}
            {isUserDropdownOpen && (
              <div className='absolute bottom-full left-16 mb-2 w-64 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg py-2 z-50'>
                <div className='px-4 py-2 border-b border-[var(--border)]'>
                  <p className='text-xs text-[var(--text-muted)]'>
                    user@example.com
                  </p>
                  <div className='flex items-center gap-2 mt-1'>
                    <div className='w-6 h-6 bg-[var(--text-primary)] rounded-full flex items-center justify-center text-white text-xs'>
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className='text-sm font-medium text-[var(--text-primary)]'>
                        Personal
                      </p>
                      <p className='text-xs text-[var(--text-muted)]'>
                        Pro plan
                      </p>
                    </div>
                    <svg
                      className='w-4 h-4 ml-auto text-blue-500'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <polyline points='20,6 9,17 4,12' />
                    </svg>
                  </div>
                </div>

                <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors'>
                  Settings
                </button>

                <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors flex items-center justify-between'>
                  Language
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M9 18l6-6-6-6' />
                  </svg>
                </button>

                <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors'>
                  Get help
                </button>

                <div className='border-t border-[var(--border)] mt-2 pt-2'>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      router.push('/pricing');
                    }}
                    className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors'
                  >
                    Upgrade plan
                  </button>

                  <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors flex items-center justify-between'>
                    Learn more
                    <svg
                      className='w-4 h-4'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <path d='M9 18l6-6-6-6' />
                    </svg>
                  </button>
                </div>

                <div className='border-t border-[var(--border)] mt-2 pt-2'>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onSignOut();
                    }}
                    disabled={isSigningOut}
                    className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors disabled:opacity-50'
                  >
                    {isSigningOut ? 'Signing out...' : 'Log out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Panel - Slides In/Out */}
      <div
        className={`h-full w-80 bg-[var(--sidebar-bg)] flex flex-col border-r border-[var(--border)] transform transition-transform duration-300 ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        } ${isDragOver ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : ''} ${
          isUploading ? 'pointer-events-none opacity-75' : ''
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header with Logo and Title */}
        {/* <div className='p-4 border-b border-[var(--border)]'> */}
        <div className='p-4'>
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-3'>
              <div className='w-6 h-6 bg-[var(--accent)] rounded-md flex items-center justify-center'>
                <svg
                  className='w-4 h-4 text-white'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                  <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
                </svg>
              </div>
              <h1 className='text-lg font-medium text-[var(--text-primary)]'>
                ReadItEasy
              </h1>
            </div>

            <button
              onClick={onToggleSidebar}
              className='p-1 hover:bg-[var(--faded-white)] rounded transition-colors'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M15 18l-6-6 6-6' />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleFileSelect}
            disabled={isUploading}
            className='flex items-center gap-3 mb-4 mt-10 text-accent disabled:opacity-50'
          >
            {isUploading ? (
              <>
                <div className='rounded-full text-white bg-accent p-1'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                </div>
                <strong>{uploadProgress}</strong>
              </>
            ) : (
              <>
                <div className='rounded-full text-white bg-accent p-1'>
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M12 5v14' />
                    <path d='M5 12h14' />
                  </svg>
                </div>
                <strong>New PDF</strong>
              </>
            )}
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type='file'
            accept='.pdf'
            onChange={handleFileChange}
            className='hidden'
          />

          {/* URL Upload Section */}
          <div className='mb-6 space-y-2'>
            <p className='text-sm text-[var(--text-muted)] font-medium'>
              Upload Any URL
            </p>
            <div className='flex gap-2'>
              <input
                type='url'
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder='https://wikipedia.com/article'
                disabled={isConvertingUrl}
                className='flex-1 px-3 py-2 text-sm bg-[var(--card-background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border)] focus:border-transparent disabled:opacity-50'
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isConvertingUrl) {
                    handleUrlUpload();
                  }
                }}
              />
              <button
                onClick={handleUrlUpload}
                disabled={isConvertingUrl || !urlInput.trim()}
                className='px-3 py-2 bg-[var(--accent)] text-[var(--button-primary-text)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1'
              >
                {isConvertingUrl ? (
                  <>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    <span className='text-xs'>Converting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className='w-4 h-4'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                      <polyline points='7,10 12,15 17,10' />
                      <line x1='12' y1='15' x2='12' y2='3' />
                    </svg>
                    <span className='text-xs'>Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Navigation Sections */}
          <div className='space-y-1'>
            <button
              onClick={() => router.push('/chats')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
                pathname === '/chats'
                  ? 'bg-[#0F0F0E] text-white'
                  : 'hover:bg-[var(--faded-white)] text-[var(--text-primary)]'
              }`}
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path
                  d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
                  className='transition-transform group-hover:translate-x-[1px] group-hover:-translate-y-[1px]'
                />
                <path
                  d='M14 8H8m6 4H8'
                  className='transition-transform group-hover:translate-x-[0.5px] group-hover:-translate-y-[0.5px]'
                />
              </svg>
              <span className='text-sm'>Chats</span>
            </button>

            {/* <button className='w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--faded-white)] transition-colors text-[var(--text-primary)]'>
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z' />
                <path d='M8 5v6' />
                <path d='M16 5v6' />
              </svg>
              <span className='text-sm'>Projects</span>
            </button>

            <button className='w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--faded-white)] transition-colors text-[var(--text-primary)]'>
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='3' />
                <path d='m12 1 0 6m0 6 0 6m11-7-6 0m-6 0-6 0' />
              </svg>
              <span className='text-sm'>Artifacts</span>
            </button> */}
          </div>
        </div>

        {/* Recents Section */}
        <div className='flex-1 overflow-hidden flex flex-col'>
          {/* <div className='px-4 py-3 border-b border-[var(--border)]'> */}
          <div className='px-4 py-2'>
            <h3 className='text-sm font-medium text-[var(--text-muted)]'>
              Recents
            </h3>
          </div>

          <div className='flex-1 overflow-y-auto'>
            {pdfHistory.length === 0 && !isLoadingPdfs ? (
              <div className='p-4 text-center'>
                <p className='text-xs text-[var(--text-muted)]'>No PDFs yet</p>
              </div>
            ) : pdfHistory.length > 0 ? (
              <div className='px-2 py-2'>
                {pdfHistory.slice(0, 15).map((pdf) => (
                  <div
                    key={pdf.id}
                    onClick={() => onPdfSelect(pdf.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors group relative cursor-pointer ${
                      selectedPdfId === pdf.id
                        ? 'bg-[#0F0F0E] text-white'
                        : 'hover:bg-[#0F0F0E] text-[var(--text-primary)]'
                    }`}
                    onMouseEnter={(e) => {
                      if (selectedPdfId !== pdf.id) {
                        const gradientDiv = e.currentTarget.querySelector(
                          '.gradient-overlay'
                        ) as HTMLElement;
                        if (gradientDiv) {
                          gradientDiv.style.background =
                            'linear-gradient(to left, #0F0F0E 80%, transparent 100%)';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPdfId !== pdf.id) {
                        const gradientDiv = e.currentTarget.querySelector(
                          '.gradient-overlay'
                        ) as HTMLElement;
                        if (gradientDiv) {
                          gradientDiv.style.background = '';
                        }
                      }
                    }}
                  >
                    <div className='flex items-center gap-2'>
                      <svg
                        className={`w-3 h-3 flex-shrink-0 ${
                          selectedPdfId === pdf.id
                            ? 'text-white'
                            : 'text-[var(--text-muted)]'
                        }`}
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                        <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
                      </svg>
                      <span className='text-sm truncate'>{pdf.title}</span>
                    </div>

                    {/* Gradient overlay with 3 dots */}
                    <div
                      className={`gradient-overlay absolute right-1 top-0 h-full w-16 flex flex-row items-center justify-end pr-2 transition-all duration-200 ${
                        selectedPdfId === pdf.id
                          ? ''
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      style={{
                        background:
                          selectedPdfId === pdf.id
                            ? 'linear-gradient(to left, #0F0F0E 80%, transparent 100%)'
                            : undefined,
                      }}
                    >
                      <div
                        className='three-dots p-2 hover:bg-white/10 rounded transition-colors relative cursor-pointer'
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(
                            activeDropdownId === pdf.id ? null : pdf.id
                          );
                        }}
                      >
                        <div className='flex flex-row gap-0.5'>
                          <div className='w-0.5 h-0.5 bg-white rounded-full'></div>
                          <div className='w-0.5 h-0.5 bg-white rounded-full'></div>
                          <div className='w-0.5 h-0.5 bg-white rounded-full'></div>
                        </div>

                        {/* Dropdown Menu */}
                        {activeDropdownId === pdf.id && (
                          <div className='pdf-action-dropdown absolute right-0 top-full mt-1 w-48 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg py-2 z-50'>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                // TODO: Implement star functionality
                              }}
                              className='w-[95%] mx-auto rounded-md px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[#0F0F0E] transition-colors flex items-center gap-3'
                            >
                              <svg
                                className='w-4 h-4'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                              >
                                <polygon points='12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26' />
                              </svg>
                              Star
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                setRenameId(pdf.id);
                                setRenameValue(pdf.title);
                              }}
                              className='w-[95%] mx-auto rounded-md px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[#0F0F0E] transition-colors flex items-center gap-3'
                            >
                              <svg
                                className='w-4 h-4'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                              >
                                <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                                <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                              </svg>
                              Rename
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                                setDeleteConfirmId(pdf.id);
                              }}
                              className='w-[95%] mx-auto rounded-md px-3 py-2 text-left text-sm text-[#E86B6B] hover:bg-[#311E1F] transition-colors flex items-center gap-3'
                            >
                              <svg
                                className='w-4 h-4'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                              >
                                <polyline points='3,6 5,6 21,6' />
                                <path d='M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2' />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Show "All Chats" button if there are more than 15 PDFs */}
                {pdfHistory.length > 15 && (
                  <div className='px-3 py-2'>
                    <button
                      onClick={() => router.push('/chats')}
                      className='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--faded-white)] hover:text-[var(--text-primary)] transition-colors group'
                    >
                      <svg
                        className='w-4 h-4'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <path
                          d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
                          className='transition-transform group-hover:translate-x-[1px] group-hover:-translate-y-[1px]'
                        />
                        <path
                          d='M14 8H8m6 4H8'
                          className='transition-transform group-hover:translate-x-[0.5px] group-hover:-translate-y-[0.5px]'
                        />
                      </svg>
                      All Chats
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* User Section with Dropdown */}
        <div
          className='border-t border-[var(--border)] relative'
          ref={dropdownRef}
        >
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className='w-full p-4 hover:bg-[var(--faded-white)] transition-colors'
          >
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-[var(--text-primary)] rounded-full flex items-center justify-center text-white text-sm font-medium'>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className='flex-1 text-left'>
                <p className='text-sm font-medium text-[var(--text-primary)] truncate'>
                  {userName}
                </p>
                <p className='text-xs text-[var(--text-muted)]'>Pro plan</p>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${
                  isUserDropdownOpen ? 'rotate-180' : ''
                }`}
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M6 9l6 6 6-6' />
              </svg>
            </div>
          </button>

          {/* User Dropdown */}
          {isUserDropdownOpen && (
            <div className='absolute bottom-full left-4 right-4 mb-2 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg py-2 z-50'>
              <div className='px-4 py-2 border-b border-[var(--border)]'>
                <p className='text-xs text-[var(--text-muted)]'>
                  user@example.com
                </p>
                <div className='flex items-center gap-2 mt-1'>
                  <div className='w-6 h-6 bg-[var(--text-primary)] rounded-full flex items-center justify-center text-white text-xs'>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className='text-sm font-medium text-[var(--text-primary)]'>
                      Personal
                    </p>
                    <p className='text-xs text-[var(--text-muted)]'>Pro plan</p>
                  </div>
                  <svg
                    className='w-4 h-4 ml-auto text-blue-500'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <polyline points='20,6 9,17 4,12' />
                  </svg>
                </div>
              </div>

              <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors'>
                Settings
              </button>

              <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors flex items-center justify-between'>
                Language
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M9 18l6-6-6-6' />
                </svg>
              </button>

              <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors'>
                Get help
              </button>

              <div className='border-t border-[var(--border)] mt-2 pt-2'>
                <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors'>
                  Upgrade plan
                </button>

                <button className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors flex items-center justify-between'>
                  Learn more
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M9 18l6-6-6-6' />
                  </svg>
                </button>
              </div>

              <div className='border-t border-[var(--border)] mt-2 pt-2'>
                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    onSignOut();
                  }}
                  disabled={isSigningOut}
                  className='w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--faded-white)] transition-colors disabled:opacity-50'
                >
                  {isSigningOut ? 'Signing out...' : 'Log out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='.pdf'
        onChange={handleFileChange}
        className='hidden'
      />

      {/* Delete Confirmation Popup */}
      {deleteConfirmId && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-[var(--card-background)] border border-[var(--border)] rounded-lg p-6 max-w-md w-full mx-4'>
            <h3 className='text-lg font-semibold text-[var(--text-primary)] mb-2'>
              Delete chat?
            </h3>
            <p className='text-sm text-[var(--text-muted)] mb-6'>
              Are you sure you want to delete this chat?
            </p>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={async () => {
                  const isActiveDeleteConfirmId =
                    selectedPdfId === deleteConfirmId;
                  const deletingPdf = pdfHistory.find(
                    (pdf) => pdf.id === deleteConfirmId
                  );

                  // Optimistic update - remove from both state and cache immediately
                  const updatedList = pdfHistory.filter(
                    (pdf) => pdf.id !== deleteConfirmId
                  );
                  updatePdfList(updatedList);

                  // If deleting active PDF, redirect to new page immediately
                  if (isActiveDeleteConfirmId) {
                    onPdfSelect('');
                    router.push('/new');
                  }

                  // Close dialog immediately
                  setDeleteConfirmId(null);

                  try {
                    const response = await fetch(
                      `/api/pdf/${deleteConfirmId}`,
                      {
                        method: 'DELETE',
                      }
                    );

                    if (!response.ok) {
                      throw new Error('Failed to delete');
                    }

                    setToast({
                      message: 'PDF deleted successfully',
                      type: 'success',
                    });
                  } catch (error) {
                    console.error('Error deleting PDF:', error);

                    // Rollback both state and cache on error
                    if (deletingPdf) {
                      const restoredList = [...pdfHistory].sort(
                        (a, b) =>
                          new Date(b.lastAccessedAt).getTime() -
                          new Date(a.lastAccessedAt).getTime()
                      );
                      updatePdfList(restoredList);
                    }

                    // Show error toast - user will need to navigate manually if they were redirected
                    setToast({
                      message: 'Sorry we failed to delete your file, try again',
                      type: 'error',
                    });
                  }
                }}
                className='px-4 py-2 text-sm bg-[#8A2423] text-white rounded-lg hover:opacity-80 transition-colors'
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className='px-4 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--faded-white)] transition-colors'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {renameId && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-[var(--card-background)] border border-[var(--border)] rounded-lg p-6 max-w-md w-full mx-4'>
            <h3 className='text-lg font-semibold text-[var(--text-primary)] mb-4'>
              Rename chat
            </h3>
            <input
              type='text'
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className='w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--sidebar-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-6'
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Save logic here
                  handleRename();
                } else if (e.key === 'Escape') {
                  setRenameId(null);
                  setRenameValue('');
                }
              }}
            />
            <div className='flex gap-3 justify-end'>
              <button
                onClick={handleRename}
                className='px-4 py-2 text-sm bg-white text-gray-800 rounded-lg hover:opacity-90 transition-opacity'
              >
                Save
              </button>
              <button
                onClick={() => {
                  setRenameId(null);
                  setRenameValue('');
                }}
                className='px-4 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--faded-white)] transition-colors'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-green-600 text-white'
          }`}
        >
          <div className='flex items-center gap-2'>
            {toast.type === 'error' ? (
              <svg
                className='w-5 h-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='10' />
                <line x1='15' y1='9' x2='9' y2='15' />
                <line x1='9' y1='9' x2='15' y2='15' />
              </svg>
            ) : (
              <svg
                className='w-5 h-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <polyline points='20,6 9,17 4,12' />
              </svg>
            )}
            <span className='text-sm font-medium'>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className='ml-2 p-1 hover:bg-white/20 rounded'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Limit Reached Popup */}
      <LimitReachedPopup
        isOpen={isLimitPopupOpen}
        onClose={closeLimitPopup}
        currentPlan={currentPlan}
        limitType={currentLimitType || 'pdfs'}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(PDFSidebar);
