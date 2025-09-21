"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/store";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Debug logging
  console.log(
    "ProtectedRoute render - user:",
    !!user,
    "isLoading:",
    isLoading,
    "isRedirecting:",
    isRedirecting
  );

  useEffect(() => {
    console.log(
      "ProtectedRoute useEffect - user:",
      !!user,
      "isLoading:",
      isLoading,
      "isRedirecting:",
      isRedirecting
    );

    if (isLoading) {
      console.log("Still loading, waiting...");
      return;
    }

    if (!user && !isRedirecting) {
      console.log("No user found, redirecting to login...");
      setIsRedirecting(true);
      router.push("/login");
    }
  }, [user, isLoading, router, isRedirecting]);

  // Wait for the authentication state to resolve
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Show redirecting state
  if (isRedirecting || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  // Render children if the user is authenticated
  return <>{children}</>;
}
