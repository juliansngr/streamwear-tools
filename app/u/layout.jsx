"use client";
import { Topbar } from "@/components/dashboard/Topbar";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Toaster } from "sonner";

export default function ULayout({ children }) {
  return (
    <div>
      <Topbar />
      <Toaster />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex gap-6">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}


