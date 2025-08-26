'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Loading from '@/components/Loading';
import PDFSidebar from '@/components/PDFSidebar';

interface Chat {
  id: string;
  pdf: {
    id: string;
    title: string;
    fileName: string;
  };
  messages: {
    content: string;
    role: string;
    createdAt: string;
  }[];
  _count: {
    messages: number;
  };
  updatedAt: string;
}

export default function ChatsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Chat-specific state
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [displayedChats, setDisplayedChats] = useState<Chat[]>([]);
  const [chatsToShow, setChatsToShow] = useState(10);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter chats based on search query
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setDisplayedChats(chats);
    } else {
      const filtered = chats.filter(
        (chat) =>
          chat.pdf.title
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          chat.pdf.fileName
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase())
      );
      setDisplayedChats(filtered);
    }
  }, [chats, debouncedSearchQuery]);

  const handleSignOut = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      setIsLoadingChats(true);
      const response = await fetch('/api/chat/list');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/signin');
    } else if (session) {
      loadChats();
    }
  }, [session, isPending, router, loadChats]);

  const formatLastInteraction = (updatedAt: string) => {
    const date = new Date(updatedAt);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  if (isPending || !session) {
    return <Loading />;
  }

  return (
    <div className='h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]'>
      <div className='flex h-full'>
        {/* PDF History Sidebar */}
        <div
          className={`bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex-shrink-0 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-16' : 'w-80 max-w-[400px]'
          }`}
        >
          <PDFSidebar
            onPdfSelect={(id) => {
              setSelectedPdfId(id);
              router.push(`/pdf/${id}`);
            }}
            selectedPdfId={selectedPdfId}
            userId={session.user.id}
            onSignOut={handleSignOut}
            isSigningOut={isLoading}
            userName={session.user.name}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            isCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Main Content Area */}
        <div className='flex-1 min-w-0 bg-[var(--pdf-viewer-bg)] overflow-hidden flex justify-center'>
          <div className='h-full flex flex-col w-full max-w-[700px] px-6'>
            {/* Header */}
            <div className='pt-8 pb-6'>
              <h1 className='text-2xl font-semibold text-[var(--text-primary)]'>
                All Documents History
              </h1>
            </div>

            {/* Search Bar */}
            <div className='pb-6'>
              <div className='relative'>
                <svg
                  className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <circle cx='11' cy='11' r='8' />
                  <path d='m21 21-4.35-4.35' />
                </svg>
                <input
                  type='text'
                  placeholder='Search chats...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full pl-10 pr-4 py-3 bg-[var(--card-background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none  focus:ring-[var(--border)]'
                />
              </div>
            </div>

            {/* Chat Count Text */}
            <div className='pb-6'>
              <p className='text-[var(--text-muted)] text-sm'>
                You have {chats.length} previous{' '}
                {chats.length === 1 ? 'chat' : 'chats'} with ReaditEasy
              </p>
            </div>

            {/* Chat List */}
            <div className='flex-1 overflow-y-auto pb-6'>
              {isLoadingChats ? (
                <div className='flex items-center justify-center h-64'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]'></div>
                </div>
              ) : displayedChats.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-64 text-center'>
                  <svg
                    className='w-12 h-12 text-[var(--text-muted)] mb-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
                    <polyline points='22,4 12,14.01 9,11.01' />
                  </svg>
                  <p className='text-[var(--text-muted)]'>
                    {searchQuery
                      ? 'No chats found matching your search'
                      : 'No chats yet'}
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {displayedChats.slice(0, chatsToShow).map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => router.push(`/pdf/${chat.pdf.id}`)}
                      className='border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--faded-white)] transition-colors cursor-pointer group'
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2 mb-2'>
                            <svg
                              className='w-4 h-4 text-[var(--text-muted)] flex-shrink-0'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                            >
                              <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                              <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
                            </svg>
                            <h3 className='font-medium text-[var(--text-primary)] truncate'>
                              {chat.pdf.title}
                            </h3>
                          </div>
                          <p className='text-sm text-[var(--text-muted)]'>
                            Last interaction:{' '}
                            {formatLastInteraction(chat.updatedAt)}
                          </p>
                        </div>
                        <div className='text-right flex-shrink-0 ml-4'>
                          <p className='text-xs text-[var(--text-muted)]'>
                            {chat._count.messages}{' '}
                            {chat._count.messages === 1
                              ? 'message'
                              : 'messages'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {displayedChats.length > chatsToShow && (
                    <div className='flex justify-center pt-4 w-full'>
                      <button
                        onClick={() => setChatsToShow((prev) => prev + 10)}
                        className='px-6 py-2 bg-transparent border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-black hover:text-white hover:border-black transition-all w-full'
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
