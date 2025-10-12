"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createBrowserClient } from "@/lib/supabase/browserClient";

export function LoginButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signInWithEmail(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setMessage("Magic Link gesendet. Bitte prüfe deine E-Mail.");
    } catch (err) {
      setMessage(err?.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithOAuth(provider) {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (err) {
      setMessage(err?.message || "OAuth fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Login</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
          <DialogDescription>Melde dich mit deiner E-Mail an.</DialogDescription>
        </DialogHeader>
        <form onSubmit={signInWithEmail} className="mt-4 grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Sende…" : "Magic Link senden"}</Button>
          <div className="text-center text-xs text-[var(--muted-foreground)]">oder</div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="w-full" onClick={() => signInWithOAuth("github")}>GitHub</Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => signInWithOAuth("google")}>Google</Button>
          </div>
          {message && <p className="text-sm text-[var(--muted-foreground)]">{message}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}


