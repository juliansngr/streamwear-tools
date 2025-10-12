"use client";
import { LoginButton } from "@/components/LoginButton";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">Nutze den Dialog, um dich anzumelden.</p>
      <div className="mt-6">
        <LoginButton />
      </div>
    </div>
  );
}


