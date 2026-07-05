import React from 'react';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  return null;
}

export function SignInButton({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function UserButton() {
  return (
    <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-base shadow-md">
      AR
    </div>
  );
}

export function useAuth() {
  return {
    getToken: () => Promise.resolve('dummy-token'),
    signOut: () => Promise.resolve(),
  };
}
