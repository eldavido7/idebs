"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    // Cashiers can only access checkout page
    if (user && user.role === "CASHIER") {
      const currentPath = window.location.pathname;
      const isCheckoutPage = currentPath === "/dashboard/checkout";

      if (!isCheckoutPage) {
        router.push("/dashboard/checkout");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // if (forbidden) {
  //   return (
  //     <div className="flex flex-col items-center justify-center h-screen">
  //       <h1 className="text-2xl font-bold text-red-600">Forbidden</h1>
  //       <p className="text-muted-foreground">Cashier users can only access the checkout page.</p>
  //     </div>
  //   );
  // }

  return <>{children}</>;
} 
