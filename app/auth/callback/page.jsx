"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browserClient";

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const supabase = createBrowserClient();
      const code = params.get("code");
      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession({ code });
        } else if (typeof window !== "undefined" && window.location.hash) {
          const h = new URLSearchParams(window.location.hash.slice(1));
          const access_token = h.get("access_token");
          const refresh_token = h.get("refresh_token");
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        }
        router.replace("/u/dashboard");
      } catch (err) {
        router.replace("/login");
      }
    };
    run();
  }, [params, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-[var(--muted-foreground)]">
      Anmeldung wird abgeschlossen…
    </div>
  );
}


