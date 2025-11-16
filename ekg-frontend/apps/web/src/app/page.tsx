"use client";

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
  return <Chat />;
}
