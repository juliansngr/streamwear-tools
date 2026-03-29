import { handleOrderCreate } from "@/lib/shopify-webhook/handlers/handleOrderCreate";
import { handleOrderUpdated } from "@/lib/shopify-webhook/handlers/handleOrderUpdated";
import { handleOrderCancelled } from "@/lib/shopify-webhook/handlers/handleOrderCancelled";
import { handleOrderPaid } from "@/lib/shopify-webhook/handlers/handleOrderPaid";
import { handleOrderFulfilled } from "@/lib/shopify-webhook/handlers/handleOrderFulfilled";
import { handleOrderPartiallyFulfilled } from "@/lib/shopify-webhook/handlers/handleOrderPartiallyFulfilled";

export function routeShopifyTopic(topicRaw) {
  const topic = String(topicRaw || "").trim().toLowerCase();

  switch (topic) {
    case "orders/create":
      return handleOrderCreate;
    case "orders/updated":
      return handleOrderUpdated;
    case "orders/cancelled":
      return handleOrderCancelled;
    case "orders/paid":
      return handleOrderPaid;
    case "orders/fulfilled":
      return handleOrderFulfilled;
    case "orders/partially_fulfilled":
      return handleOrderPartiallyFulfilled;
    default:
      return null;
  }
}

