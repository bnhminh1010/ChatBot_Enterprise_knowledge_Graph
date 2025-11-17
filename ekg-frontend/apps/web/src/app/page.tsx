"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import dynamic from "next/dynamic";

const Chat = dynamic(() => import("@/components/chat/Chat"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-muted-foreground">Loading chat...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      // Redirect to login if not authenticated
      router.push("/login");
    }
  }, [router]);

  // Show chat only if authenticated
  if (!authService.isAuthenticated()) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <Chat />;
}
