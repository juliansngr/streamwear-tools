import { Resend } from "resend";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM;

export async function getUserEmailFromAuth(userId) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) {
    console.error("[email] getUserById error", { userId, error });
    return null;
  }
  return data.user?.email ?? null;
}

export async function sendGiveawayOrderEmail({
  to,
  streamerName,
  productTitle,
}) {
  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Neue Giveaway-Bestellung 🎁",
    html: `
    <p>Hey ${streamerName},</p>
    <p>du hast eine neue <strong>Giveaway-Bestellung</strong> in deinem Streamwear-Merchshop erhalten.</p>
    <p><strong>Gewähltes Produkt:</strong> ${productTitle}</p>
    <p>Im Dashboard kannst du das Giveaway starten, deine Community teilnehmen lassen und den Gewinner ziehen:</p>
    <p><a href="https://streamwear.xyz/giveaways" target="_blank" rel="noopener noreferrer">➡ Zum Giveaway-Dashboard</a></p>
    <p>Viel Spaß beim Verschenken im Stream 💜</p>
  `,
  });
}
