"use client";

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
}) {
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
          <div className="text-6xl -mt-5 font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {quantity ? `${quantity} × ` : ""}{title}
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


