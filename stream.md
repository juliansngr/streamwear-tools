# 💡 Projekt-Setup für streamwear. – Shopify Webhook → Alertbox (Next.js + Supabase)

Dieses Projekt soll automatisch Alerts auf https://streamwear.xyz/alertbox/[UUID] anzeigen, sobald bei Shopify eine Bestellung eingeht.

---

## 🎯 Ziel

- Shopify sendet bei jeder Bestellung (`orders/create`) einen **Webhook** an dein Next.js Backend  
- Das Backend prüft die Bestellung und ruft über die **Shopify API** ab, zu welchen **Collections (Streamer)** die bestellten Produkte gehören  
- Für jeden betroffenen Streamer (über die Collection-Handles gemappt) wird über **Supabase Realtime** ein **Alert** an die jeweilige URL `/alertbox/[UUID]` ausgelöst  
- Die Alertbox zeigt die Bestellinfo als Overlay auf dem Stream des jeweiligen Streamers

---

## 🧱 Architekturüberblick

1. **Shopify → Next.js API Route** `/api/webhooks/shopify`
2. **Verifizierung** via HMAC (`SHOPIFY_WEBHOOK_SECRET`)
3. **Shopify API** → Produkte → Collections (Streamer)
4. **Mapping** `collection_handle` → `uuid` (Supabase Tabelle `streamers`)
5. **Realtime Broadcast** über Supabase-Channel `${ALERT_TOPIC_PREFIX}:${uuid}`
6. **Frontend** `/alertbox/[uuid]` empfängt Broadcast → zeigt Alert via React-Komponente

---

## ⚙️ Environment Variablen (.env.local)

```env
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxx

NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE=xxxx

ALERT_TOPIC_PREFIX=streamwear-alerts
