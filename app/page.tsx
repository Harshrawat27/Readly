'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

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

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/signin');
    }
  }, [session, isPending, router]);

  if (isPending || !session) {
    return null; // Let Next.js loading.tsx handle the loading state
  }

  return (
    <AppLayout
      session={session}
      onSignOut={handleSignOut}
      isSigningOut={isLoading}
      selectedPdfId={selectedPdfId}
      onPdfSelect={(id) => router.push(`/pdf/${id}`)}
      selectedText={selectedText}
      onTextSelect={setSelectedText}
      onTextSubmit={() => setSelectedText('')}
    />
  );
}
