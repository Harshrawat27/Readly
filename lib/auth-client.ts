import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000',
});

// Export the methods from the client
export const { signIn, signUp, signOut, useSession } = authClient;
