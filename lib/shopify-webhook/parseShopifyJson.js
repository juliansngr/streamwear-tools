import JSONbigFactory from "json-bigint";

const JSONbig = JSONbigFactory({ storeAsString: true });

export function parseShopifyJson(rawBody) {
  if (typeof rawBody !== "string") {
    throw new Error("Expected rawBody string");
  }
  return JSONbig.parse(rawBody);
}

