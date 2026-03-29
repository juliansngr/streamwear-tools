export function createDbg(enabled) {
  return function dbg(label, data) {
    if (!enabled) return;
    try {
      console.log("[shopify:webhook]", label, data ?? "");
    } catch {}
  };
}

