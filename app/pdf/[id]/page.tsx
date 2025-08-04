'use client';

import { useSession, signOut } from '@/lib/auth-client';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PDFLayout from '@/components/PDFLayout';

export default function PDFPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');

  const pdfId = params.id as string;

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
    <PDFLayout
      session={session}
      onSignOut={handleSignOut}
      isSigningOut={isLoading}
      pdfId={pdfId}
      selectedText={selectedText}
      onTextSelect={setSelectedText}
      onTextSubmit={() => setSelectedText('')}
    />
  );
}
