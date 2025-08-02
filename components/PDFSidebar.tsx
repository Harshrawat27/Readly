'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

export default function PDFSidebar({
  onPdfSelect,
  selectedPdfId,
  userId,
  onSignOut,
  isSigningOut,
  userName,
  onToggleSidebar,
  isCollapsed,
}: PDFSidebarProps) {
  const router = useRouter();
  const [pdfHistory, setPdfHistory] = useState<PDFItem[]>([]);
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load PDFs from API with caching
  const loadPdfs = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsLoadingPdfs(true);

        // Check cache first (cache for 5 minutes)
        const cacheKey = `pdf-list-${userId}`;
        const cacheTimeKey = `pdf-list-time-${userId}`;
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        const now = Date.now();
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

        if (
          !forceRefresh &&
          cached &&
          cacheTime &&
          now - parseInt(cacheTime) < cacheMaxAge
        ) {
          const cachedPdfs = JSON.parse(cached);
          setPdfHistory(
            cachedPdfs.map((pdf: any) => ({
              ...pdf,
              uploadedAt: new Date(pdf.uploadedAt),
              lastAccessedAt: new Date(pdf.lastAccessedAt),
            }))
          );
          setIsLoadingPdfs(false);
          return;
        }

        const response = await fetch('/api/pdf/list');
        if (response.ok) {
          const pdfs = await response.json();
          // Cache the response
          localStorage.setItem(cacheKey, JSON.stringify(pdfs));
          localStorage.setItem(cacheTimeKey, now.toString());

          setPdfHistory(
            pdfs.map((pdf: any) => ({
              ...pdf,
              uploadedAt: new Date(pdf.uploadedAt),
              lastAccessedAt: new Date(pdf.lastAccessedAt),
            }))
          );
        }
      } catch (error) {
        console.error('Error loading PDFs:', error);
      } finally {
        setIsLoadingPdfs(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadPdfs();
  }, [loadPdfs]);

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

  // Listen for page focus to refresh PDF list when returning from upload
  useEffect(() => {
    const handleFocus = () => {
      // Only refresh if we might have uploaded a new PDF
      const lastUploadNavigation = localStorage.getItem(
        'last-upload-navigation'
      );
      if (lastUploadNavigation) {
        const timeSinceUpload = Date.now() - parseInt(lastUploadNavigation);
        // If less than 30 minutes since upload navigation, refresh the list
        if (timeSinceUpload < 30 * 60 * 1000) {
          loadPdfs(true); // Force refresh
          localStorage.removeItem('last-upload-navigation');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadPdfs]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const pdfFile = files.find((file) => file.type === 'application/pdf');

      if (pdfFile) {
        // Clear cache before navigating to upload page
        const cacheKey = `pdf-list-${userId}`;
        const cacheTimeKey = `pdf-list-time-${userId}`;
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(cacheTimeKey);
        localStorage.setItem('last-upload-navigation', Date.now().toString());

        // Navigate to upload page with the file
        router.push('/upload');
      } else {
        alert('Please drop a valid PDF file.');
      }
    },
    [router, userId]
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleRename = async () => {
    if (!renameId || !renameValue.trim()) return;

    const newTitle = renameValue.trim();
    const oldTitle = pdfHistory.find((pdf) => pdf.id === renameId)?.title || '';

    // Optimistic update - update UI immediately
    setPdfHistory((prev) =>
      prev.map((pdf) =>
        pdf.id === renameId ? { ...pdf, title: newTitle } : pdf
      )
    );

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
    } catch (error) {
      console.error('Error renaming PDF:', error);

      // Rollback the optimistic update
      setPdfHistory((prev) =>
        prev.map((pdf) =>
          pdf.id === renameId ? { ...pdf, title: oldTitle } : pdf
        )
      );

      // Show error toast
      setToast({
        message: 'Sorry we failed to rename your file, try again',
        type: 'error',
      });
    }
  };

  if (isCollapsed) {
    return (
      <div className='h-full w-16 bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col relative'>
        {/* Header with Logo */}
        <div className='p-3 border-b border-[var(--border)]'>
          <button
            onClick={onToggleSidebar}
            className='w-8 h-8 bg-[var(--accent)] rounded-md flex items-center justify-center mx-auto hover:opacity-90 transition-opacity'
            title='Expand sidebar'
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
            onClick={() => {
              // Clear cache before navigating to upload page
              const cacheKey = `pdf-list-${userId}`;
              const cacheTimeKey = `pdf-list-time-${userId}`;
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(cacheTimeKey);
              localStorage.setItem(
                'last-upload-navigation',
                Date.now().toString()
              );

              router.push('/upload');
            }}
            className='w-10 h-10 mx-3 mb-2 bg-[var(--accent)] text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity'
            title='New PDF'
          >
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

          {/* User Dropdown for Collapsed State */}
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
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-[var(--sidebar-bg)] ${
        isDragOver ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header with Logo and Title */}
      <div className='p-4 border-b border-[var(--border)]'>
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
              Readly
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
          onClick={() => {
            // Clear cache before navigating to upload page
            const cacheKey = `pdf-list-${userId}`;
            const cacheTimeKey = `pdf-list-time-${userId}`;
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(cacheTimeKey);
            localStorage.setItem(
              'last-upload-navigation',
              Date.now().toString()
            );

            router.push('/upload');
          }}
          className='w-full bg-[var(--accent)] text-white rounded-lg py-2.5 px-4 font-medium hover:opacity-90 transition-opacity flex items-center gap-3 mb-4'
        >
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
          New PDF
        </button>

        {/* Navigation Sections */}
        <div className='space-y-1'>
          <button className='w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--faded-white)] transition-colors text-[var(--text-primary)]'>
            <svg
              className='w-4 h-4'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
              <polyline points='22,4 12,14.01 9,11.01' />
            </svg>
            <span className='text-sm'>Chats</span>
          </button>

          <button className='w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--faded-white)] transition-colors text-[var(--text-primary)]'>
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
          </button>
        </div>
      </div>

      {/* Recents Section */}
      <div className='flex-1 overflow-hidden flex flex-col'>
        <div className='px-4 py-3 border-b border-[var(--border)]'>
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
              {pdfHistory.map((pdf) => (
                <button
                  key={pdf.id}
                  onClick={() => onPdfSelect(pdf.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors group relative ${
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
                    <button
                      className='three-dots p-2 hover:bg-white/10 rounded transition-colors relative'
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
                    </button>
                  </div>
                </button>
              ))}
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

                  // Optimistic update - remove from UI immediately
                  setPdfHistory((prev) =>
                    prev.filter((pdf) => pdf.id !== deleteConfirmId)
                  );

                  // If deleting active PDF, redirect to home
                  if (isActiveDeleteConfirmId) {
                    onPdfSelect('');
                    router.push('/');
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
                  } catch (error) {
                    console.error('Error deleting PDF:', error);

                    // Rollback the optimistic update
                    if (deletingPdf) {
                      setPdfHistory((prev) =>
                        [...prev, deletingPdf].sort(
                          (a, b) =>
                            new Date(b.lastAccessedAt).getTime() -
                            new Date(a.lastAccessedAt).getTime()
                        )
                      );

                      // If we redirected to home, redirect back
                      if (isActiveDeleteConfirmId) {
                        onPdfSelect(deletingPdf.id);
                        router.push(`/pdf/${deletingPdf.id}`);
                      }
                    }

                    // Show error toast
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
    </div>
  );
}
