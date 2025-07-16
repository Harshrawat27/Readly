'use client';
import React from 'react';
import { useRouter } from 'next/navigation'; // Changed from 'next/router'
import { authClient } from '@/lib/auth-client';

const Dashboard = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/login'); // redirect to login page
          },
        },
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Handle error appropriately
    }
  };

  return (
    <div>
      welcome here!
      <button
        onClick={handleLogout}
        className='p-2 backdrop-blur-sm bg-amber-300'
      >
        Signout
      </button>
    </div>
  );
};

export default Dashboard;
