"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <main className="center-screen">
        <div className="loading-panel">Loading workspace...</div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}
