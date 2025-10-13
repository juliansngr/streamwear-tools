"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browserClient";

export function OverlayAlert({
  videoSrc = "/alertbox/alert_1.webm",
  title = "Neuer Kauf",
  variantTitle,
  quantity,
  price,
  currency,
  widthPx = 520,
  animDurationMs = 8000,
  loop = false,
  muted = false,
  videoKey,
  subtitle,
  userName,
  uuid
}) {
  const [fetchedSubtitle, setFetchedSubtitle] = useState("");
  const nameToUse = userName ? userName : "Anonymous";

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createBrowserClient();
        let text = "";
        if (uuid) {
          const { data, error } = await supabase
            .from("shopify_connectors")
            .select("alertbox_text")
            .eq("uuid", uuid)
            .limit(1)
            .maybeSingle();
          if (!error) text = data?.alertbox_text || "";
        } else {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData?.user?.id;
          if (userId) {
            const { data, error } = await supabase
              .from("shopify_connectors")
              .select("alertbox_text")
              .eq("user_id", userId)
              .limit(1)
              .maybeSingle();
            if (!error) text = data?.alertbox_text || "";
          }
        }
        setFetchedSubtitle(text);
      } catch {
        setFetchedSubtitle("");
      }
    };
    load();
  }, [uuid]);

  const rawSubtitle = subtitle ?? fetchedSubtitle;
  const subtitleToUse = rawSubtitle
    ? rawSubtitle.replace(/{{\s*TwitchUserName\s*}}/g, nameToUse)
    : "";


  return (
    <>
      <div className="relative isolate p-0 flex flex-col items-center justify-center">
        <div className="overflow-hidden rounded-lg">
          <video
            key={videoKey}
            src={videoSrc}
            autoPlay
            loop={loop}
            muted={muted}
            playsInline
            className="block h-auto"
            style={{ width: `${widthPx}px` }}
          />
        </div>
        <div
          className="alert-text-anim flex flex-col items-center justify-center"
          style={{ ["--dur"]: `${animDurationMs}ms`, ["--iter"]: loop ? "infinite" : "1" }}
        >
          <div className="flex flex-col items-center justify-center max-w-lg text-6xl -mt-5 font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            {subtitleToUse && (
              <span className="text-5xl text-center font-normal mb-4">{subtitleToUse}</span>
            )}
            {/* <span>{quantity ? `${quantity} × ` : ""}{title}</span> */}
          </div>
        </div>
      </div>
      <style jsx>{`
        .alert-text-anim {
          opacity: 1;
          animation-name: alertText;
          animation-duration: var(--dur);
          animation-timing-function: ease-in-out;
          animation-fill-mode: both;
          animation-iteration-count: var(--iter);
        }
        @media (prefers-reduced-motion: reduce) {
          .alert-text-anim { animation: none; opacity: 1; transform: none; }
        }
        @keyframes alertText {
          0% { opacity: 0; transform: translateY(6px); }
          25% { opacity: 1; transform: translateY(0); }
          75% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}


