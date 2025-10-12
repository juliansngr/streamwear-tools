"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browserClient";

export default function AlertboxPage() {
  const { uuid } = useParams();
  const [last, setLast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
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
    };
  }, [uuid]);

  return (
    <div className="fixed inset-0 flex items-end justify-start p-10">
      {last && (
        <div className="relative isolate rounded-xl border border-white/10 bg-black/40 p-3 shadow-2xl backdrop-blur-md">
          <div className="overflow-hidden rounded-lg">
            <video
              key={last._key}
              src="/alertbox/alert_1.webm"
              autoPlay
              playsInline
              className="block h-auto w-[420px] sm:w-[520px]"
            />
          </div>
          <div className="mt-2 rounded-md bg-black/50 px-3 py-2 ring-1 ring-white/10">
            <div className="text-sm font-semibold">
              {last.product_title || "Neuer Kauf"}
            </div>
            <div className="text-xs opacity-90">
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


