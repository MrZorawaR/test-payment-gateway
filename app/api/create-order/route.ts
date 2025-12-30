import { cashfree } from "@/lib/cashfree";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { amount } = await req.json();

  const orderId = "BOOK_" + Date.now();

  const order = await cashfree.PGCreateOrder({
    order_id: orderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: "user_001",
      customer_name: "Hardcoded User",
      customer_email: "user@test.com",
      customer_phone: "9999999999",
    },
    order_meta: {
      payment_methods: "upi",
    },
  });

  await supabase.from("bookings").insert({
    user_name: "Hardcoded User",
    package_name: "Manali Trip",
    amount,
    order_id: orderId,
    payment_status: "PENDING",
  });

  return Response.json(order.data);
}
