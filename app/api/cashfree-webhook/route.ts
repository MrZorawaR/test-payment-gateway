import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  // Get the raw webhook body as text
  const rawBody = await req.text();

  // Read Cashfree webhook headers
  const signature = req.headers.get("x-webhook-signature");
  const timestamp = req.headers.get("x-webhook-timestamp");

  // If either header is missing, just acknowledge (Cashfree test calls might omit)
  if (!signature || !timestamp) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Create the signed payload exactly as Cashfree docs describe
  const signedPayload = timestamp + rawBody;

  // Compute HMAC SHA256 using your Cashfree secret key
  const expectedSignature = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY!)
    .update(signedPayload)
    .digest("base64");

  // If signature doesn't match, reject
  if (signature !== expectedSignature) {
    console.error("❌ Webhook signature mismatch");
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse the JSON body now that verification passed
  const event = JSON.parse(rawBody);

  console.log("✅ Verified webhook event:", event.type);

  // Handle payment success
  if (event.type === "PAYMENT_SUCCESS" || event.type === "PAYMENT_SUCCESS_WEBHOOK") {
    const orderId = event.data.order.order_id;
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "PAID" })
      .eq("order_id", orderId);

    if (error) console.error("Supabase update error:", error);
  }

  // Handle payment failed (optional)
  if (event.type === "PAYMENT_FAILED" || event.type === "PAYMENT_FAILED_WEBHOOK") {
    const orderId = event.data.order.order_id;
    await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "FAILED" })
      .eq("order_id", orderId);
  }

  // Always respond with 200 OK
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
