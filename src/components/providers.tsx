"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/AuthContext";
import type { Session } from "next-auth";

// Agrupa SessionProvider + AuthProvider en un Client Component
// para poder importarlo desde el Server Component layout.tsx
export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const prefix = process.env.NEXT_PUBLIC_URL_PREFIX || "";
  const authBasePath = prefix ? `${prefix}/api/auth` : undefined;
  return (
    <SessionProvider session={session} basePath={authBasePath}>
      <AuthProvider>{children}</AuthProvider>
    </SessionProvider>
  );
}
