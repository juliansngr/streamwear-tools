import crypto from "node:crypto";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

export async function verifyShopifyWebhook(request, { dbg } = {}) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!hmacHeader || !SHOPIFY_WEBHOOK_SECRET) {
    dbg?.("verify:missing", {
      hasHeader: !!hmacHeader,
      hasSecret: !!SHOPIFY_WEBHOOK_SECRET,
      raw_len: rawBody?.length || 0,
    });
    return { ok: false, rawBody };
  }

  const digest = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  let ok = false;
  try {
    ok = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    ok = false;
  }

  dbg?.("verify:result", {
    ok,
    header_fp: hmacHeader?.slice(-8),
    digest_fp: digest?.slice(-8),
    raw_len: rawBody?.length || 0,
  });

  return { ok, rawBody };
}

