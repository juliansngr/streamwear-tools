"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browserClient";
import { OverlayAlert } from "@/components/alert/OverlayAlert";

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
    <>
      <div className="h-dvh w-dvw flex items-center justify-center p-10">
        {last && (
          <OverlayAlert
            videoKey={last._key}
            videoSrc="/alertbox/alert_1.webm"
            title={last.product_title || "Neuer Kauf"}
            variantTitle={last.variant_title}
            quantity={last.quantity}
            price={last.price}
            currency={last.currency}
            widthPx={520}
            animDurationMs={8000}
            uuid={uuid}
          />
        )}
                    <OverlayAlert
              videoSrc="/alertbox/alert_1.webm"
              title="Creator Hoodie"
              variantTitle="Größe L"
              quantity={1}
              price="€59,00"
              currency=""
              widthPx={520}
              animDurationMs={8000}
              loop={true}
              muted={true}
              videoKey="preview"
            />
      </div>
    </>
  );
}


