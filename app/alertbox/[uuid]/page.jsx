"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browserClient";

export default function AlertboxPage() {
  const { uuid } = useParams();
  const [last, setLast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Seite vollständig transparent für OBS
    const prevHtmlBg = typeof window !== "undefined" ? document.documentElement.style.background : "";
    const prevBodyBg = typeof window !== "undefined" ? document.body.style.background : "";
    if (typeof window !== "undefined") {
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
    }
    const supabase = createBrowserClient();
    const channel = supabase.channel(`${process.env.NEXT_PUBLIC_ALERT_TOPIC_PREFIX || "streamwear-alerts"}:${uuid}`);
    channel.on("broadcast", { event: "alert" }, (payload) => {
      const data = payload?.payload || payload;
      // set a unique key to restart the video
      setLast({ ...data, _key: Date.now() });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setLast(null), 8000);
    });
    channel.subscribe();
    return () => {
      channel.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof window !== "undefined") {
        document.documentElement.style.background = prevHtmlBg;
        document.body.style.background = prevBodyBg;
      }
    };
  }, [uuid]);

  return (
    <div className="fixed inset-0 flex items-end justify-start p-10">
      {last && (
        <div className="relative isolate p-0">
          <div className="overflow-hidden rounded-lg">
            <video
              key={last._key}
              src="/alertbox/alert_1.webm"
              autoPlay
              playsInline
              className="block h-auto w-[420px] sm:w-[520px]"
            />
          </div>
          <div className="mt-2 px-1 py-1">
            <div className="text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {last.product_title || "Neuer Kauf"}
            </div>
            <div className="text-xs text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {last.variant_title ? `${last.variant_title} · ` : ""}
              {last.quantity ? `${last.quantity} × ` : ""}
              {last.price ? `${last.price}` : ""} {last.currency || ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


