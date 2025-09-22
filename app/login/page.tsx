"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/store";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const { user, login, isLoading } = useAuthStore();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "ADMIN") {
        router.push("/dashboard");
      } else if (user.role === "CASHIER") {
        router.push("/dashboard/checkout");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const success = await login(email, password);
    if (success) {
      // Get the updated user object from the store
      const currentUser = useAuthStore.getState().user;

      if (currentUser) {
        toast({
          title: "Login successful",
          description: `Welcome ${currentUser.name || currentUser.email}!`,
        });

        // Redirect based on role
        if (currentUser.role === "ADMIN") {
          router.push("/dashboard");
        } else if (currentUser.role === "CASHIER") {
          router.push("/dashboard/checkout");
        }
      }
    } else {
      setError("Invalid email or password");
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">IDEBS Dashboard</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@idebs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs"
                  type="button"
                >
                  Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="grid text-center text-sm text-muted-foreground">
          <p className="w-full">
            Demo credentials: admin@idebs.com / admin123
          </p>
          <p className="w-full">
            cashier@idebs.com / cash123
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
