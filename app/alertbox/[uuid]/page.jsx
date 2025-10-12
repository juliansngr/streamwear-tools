"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browserClient";

export default function AlertboxPage() {
  const { uuid } = useParams();
  const [last, setLast] = useState(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase.channel(`${process.env.NEXT_PUBLIC_ALERT_TOPIC_PREFIX || "streamwear-alerts"}:${uuid}`);
    channel.on("broadcast", { event: "alert" }, (payload) => setLast(payload?.payload || payload));
    channel.subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [uuid]);

  return (
    <div className="fixed inset-0 flex items-end justify-start p-10">
      {last && (
        <div className="relative isolate flex items-center gap-3 rounded-xl border border-white/10 bg-black/65 px-5 py-4 shadow-2xl backdrop-blur-md">
          <div className="text-sm font-semibold">{last.product_title || "Neuer Kauf"}</div>
          <div className="text-xs opacity-80">
            {last.variant_title} · {last.quantity} × {last.price} {last.currency}
          </div>
        </div>
      )}
    </div>
  );
}


