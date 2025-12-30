"use client";

const PACKAGE = {
  name: "Manali Trip (3D / 2N)",
  amount: 4999,
};

export default function Home() {
  async function bookNow() {
    const res = await fetch("/api/create-order", {
      method: "POST",
      body: JSON.stringify({
        amount: PACKAGE.amount,
      }),
    });

    const order = await res.json();

    const cashfree = (window as any).Cashfree({
      mode: "sandbox", // or "production"
    });
    await cashfree.checkout({
      paymentSessionId: order.payment_session_id,
      redirectTarget: "_modal",
      paymentMethods: {
        upi: true,
        card: false,
        netbanking: false,
        wallet: false,
        paylater: false,
        emi: false,
      },
    });
  }

  return (
    <div className="p-10">
      <h1>{PACKAGE.name}</h1>
      <p>Price: ₹{PACKAGE.amount}</p>
      <button onClick={bookNow}>Book Now</button>
    </div>
  );
}
