import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import Stripe from "stripe";
import { plans } from "@/data/plans";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  const body = await req.text();

  const signature = (await headers()).get("stripe-signature");

  let data;
  let eventType;
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error(`Webhook verification failed: ${error.message}`);
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }

  data = event.data;
  eventType = event.type;

  switch (eventType) {
    case "checkout.session.completed": {
      const session = await stripe.checkout.sessions.retrieve(data.object.id, {
        expand: ["line_items"],
      });
      const customerId = session?.customer;
      const customer = await stripe.customers.retrieve(customerId);

      const priceId = session?.line_items?.data[0]?.price.id;

      if (plans.priceId !== priceId) break;

      if (customer.email) {
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });

        if (userError) {
          console.error(`Error fetching users: ${userError.message}`);
          break;
        }

        const user = userData.users.find(
          (user) => user.email === customer.email
        );

        if (!user) {
          console.error(`User not found: ${customerId}`);
          break;
        }

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ is_pro: true, stripe_id: customerId })
          .eq("user_id", user.id);

        if (updateError) {
          console.error(`Error updating user: ${updateError.message}`);
          break;
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = await stripe.subscriptions.retrieve(data.object.id);

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ is_pro: false, stripe_id: null })
        .eq("stripe_id", subscription.customer);

      if (updateError) {
        console.error(`Error updating user: ${updateError.message}`);
        break;
      }

      break;
    }
    default:
      console.log(`Unhandled event type ${eventType}`);
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
