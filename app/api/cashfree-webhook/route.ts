import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  console.log("webhook hitted")
  const rawBody = await req.text();
  console.log("rawBody:", rawBody);
  const signature = req.headers.get("x-webhook-signature");

  // Allow dashboard test calls
  if (!signature) {
    return Response.json({ ok: true });
  }

  // ✅ Cashfree uses x-secret-key for webhook signing
  const computedSignature = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY!)
    .update(rawBody)
    .digest("base64");

  if (signature !== computedSignature) {
    console.error("❌ Signature mismatch");
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);

  console.log("✅ Webhook verified:", event.type);

  if (event.type === "PAYMENT_SUCCESS") {
    const orderId = event.data.order.order_id;

    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "PAID" })
      .eq("order_id", orderId);

    if (error) {
      console.error("Supabase error:", error);
    }
  }

  if (event.type === "PAYMENT_FAILED") {
    const orderId = event.data.order.order_id;

    await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "FAILED" })
      .eq("order_id", orderId);
  }

  return Response.json({ ok: true });
}
