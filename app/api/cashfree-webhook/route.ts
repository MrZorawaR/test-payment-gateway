import crypto from "crypto";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-webhook-signature")!;

  const expected = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY!)
    .update(body)
    .digest("base64");

  if (signature !== expected) {
    return new Response("Invalid", { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.type === "PAYMENT_SUCCESS") {
    await supabase
      .from("bookings")
      .update({ payment_status: "PAID" })
      .eq("order_id", event.data.order.order_id);
  }

  return Response.json({ ok: true });
}
