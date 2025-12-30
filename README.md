# Cashfree Payment Gateway Integration

A complete Next.js application demonstrating Cashfree payment gateway integration with Supabase for booking management.

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Code Explanation](#code-explanation)
  - [Cashfree SDK Initialization](#1-cashfree-sdk-initialization)
  - [Order Creation API](#2-order-creation-api)
  - [Frontend Checkout](#3-frontend-checkout)
  - [Webhook Handler](#4-webhook-handler)
  - [Database Integration](#5-database-integration)
- [Integration Flow](#integration-flow)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Conclusion](#conclusion)
- [License](#license)

---

## Introduction

**Cashfree** is a leading payment gateway in India that enables businesses to collect and disburse payments. This integration demonstrates:

- **Order Creation**: Server-side order generation using Cashfree's PG SDK
- **Checkout Modal**: Client-side payment UI using Cashfree's JavaScript SDK
- **Webhook Handling**: Secure payment status updates via webhooks
- **Database Persistence**: Booking records management with Supabase

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Next.js API    │────▶│   Cashfree API  │
│   (page.tsx)    │     │   (create-order) │     │                 │
└────────┬────────┘     └──────────────────┘     └────────┬────────┘
         │                                                 │
         │  Payment Modal                                  │
         ▼                                                 │
┌─────────────────┐                              ┌─────────▼────────┐
│  Cashfree SDK   │◀─────────────────────────────│   Webhook        │
│  (checkout.js)  │                              │   (POST callback)│
└─────────────────┘                              └─────────┬────────┘
                                                           │
                                                  ┌────────▼────────┐
                                                  │    Supabase     │
                                                  │   (bookings)    │
                                                  └─────────────────┘
```

---

## Prerequisites

| Requirement | Version/Details |
|-------------|-----------------|
| Node.js | v18+ |
| npm/yarn/pnpm | Latest |
| Cashfree Account | [Sandbox](https://merchant.cashfree.com) |
| Supabase Project | [Dashboard](https://supabase.com) |

### Required Packages

```json
{
  "dependencies": {
    "cashfree-pg": "latest",
    "@supabase/supabase-js": "latest",
    "next": "15.x"
  }
}
```

---

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cashfree-booking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (see [Environment Configuration](#environment-configuration))

4. **Create Supabase table**
   ```sql
   CREATE TABLE bookings (
     id SERIAL PRIMARY KEY,
     user_name TEXT NOT NULL,
     package_name TEXT NOT NULL,
     amount DECIMAL(10,2) NOT NULL,
     order_id TEXT UNIQUE NOT NULL,
     payment_status TEXT DEFAULT 'PENDING',
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

---

## Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Cashfree Configuration
CASHFREE_APP_ID="your-cashfree-app-id"
CASHFREE_SECRET_KEY="your-cashfree-secret-key"
```

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Public anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (keep secret!) | Supabase Dashboard → Settings → API |
| `CASHFREE_APP_ID` | Cashfree App ID | Cashfree Dashboard → Credentials |
| `CASHFREE_SECRET_KEY` | Cashfree Secret Key | Cashfree Dashboard → Credentials |

---

## Code Explanation

### 1. Cashfree SDK Initialization

**File**: `lib/cashfree.ts`

```typescript
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,           // Environment: SANDBOX or PRODUCTION
  process.env.CASHFREE_APP_ID!,    // Your Cashfree App ID
  process.env.CASHFREE_SECRET_KEY! // Your Cashfree Secret Key
);

export { cashfree };
```

**Explanation**:
- **`CFEnvironment.SANDBOX`**: Use for testing; switch to `CFEnvironment.PRODUCTION` for live payments
- **`CASHFREE_APP_ID`**: Identifies your merchant account
- **`CASHFREE_SECRET_KEY`**: Used for API authentication and webhook verification

---

### 2. Order Creation API

**File**: `app/api/create-order/route.ts`

```typescript
import { cashfree } from "@/lib/cashfree";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  // Extract amount from request body
  const { amount } = await req.json();

  // Generate unique order ID with timestamp
  const orderId = "BOOK_" + Date.now();

  // Create order with Cashfree PG API
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
      payment_methods: "upi", // Restrict to UPI only
    },
  });

  // Persist booking record in Supabase
  await supabase.from("bookings").insert({
    user_name: "Hardcoded User",
    package_name: "Manali Trip",
    amount,
    order_id: orderId,
    payment_status: "PENDING",
  });

  // Return order data including payment_session_id
  return Response.json(order.data);
}
```

**Key Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `order_id` | string | Unique identifier for the order (must be unique per transaction) |
| `order_amount` | number | Transaction amount in specified currency |
| `order_currency` | string | Currency code (INR, USD, etc.) |
| `customer_details` | object | Customer information for receipts and notifications |
| `order_meta.payment_methods` | string | Comma-separated list of allowed payment methods |

**Response Structure**:
```json
{
  "cf_order_id": "123456789",
  "order_id": "BOOK_1234567890",
  "order_status": "ACTIVE",
  "payment_session_id": "session_xxxxx"
}
```

---

### 3. Frontend Checkout

**File**: `app/page.tsx`

```typescript
"use client";

const PACKAGE = {
  name: "Manali Trip (3D / 2N)",
  amount: 4999,
};

export default function Home() {
  async function bookNow() {
    // Step 1: Create order via API
    const res = await fetch("/api/create-order", {
      method: "POST",
      body: JSON.stringify({
        amount: PACKAGE.amount,
      }),
    });

    const order = await res.json();

    // Step 2: Initialize Cashfree SDK
    const cashfree = (window as any).Cashfree({
      mode: "sandbox", // "sandbox" for testing, "production" for live
    });

    // Step 3: Open checkout modal
    await cashfree.checkout({
      paymentSessionId: order.payment_session_id,
      redirectTarget: "_modal", // Opens as modal overlay
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
```

**Checkout Options**:

| Option | Values | Description |
|--------|--------|-------------|
| `redirectTarget` | `_modal`, `_self`, `_blank` | How checkout opens |
| `paymentMethods.upi` | boolean | Enable/disable UPI payments |
| `paymentMethods.card` | boolean | Enable/disable card payments |

**SDK Script Loading** (in `app/layout.tsx`):

```tsx
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

---

### 4. Webhook Handler

**File**: `app/api/cashfree-webhook/route.ts`

```typescript
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  // Get raw body for signature verification
  const rawBody = await req.text();

  // Extract Cashfree webhook headers
  const signature = req.headers.get("x-webhook-signature");
  const timestamp = req.headers.get("x-webhook-timestamp");

  // Skip verification for test webhooks
  if (!signature || !timestamp) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Construct signed payload
  const signedPayload = timestamp + rawBody;

  // Compute expected signature using HMAC SHA256
  const expectedSignature = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY!)
    .update(signedPayload)
    .digest("base64");

  // Verify signature matches
  if (signature !== expectedSignature) {
    console.error("❌ Webhook signature mismatch");
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse verified payload
  const event = JSON.parse(rawBody);
  console.log("✅ Verified webhook event:", event.type);

  // Handle PAYMENT_SUCCESS
  if (event.type === "PAYMENT_SUCCESS" || event.type === "PAYMENT_SUCCESS_WEBHOOK") {
    const orderId = event.data.order.order_id;
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "PAID" })
      .eq("order_id", orderId);

    if (error) console.error("Supabase update error:", error);
  }

  // Handle PAYMENT_FAILED
  if (event.type === "PAYMENT_FAILED" || event.type === "PAYMENT_FAILED_WEBHOOK") {
    const orderId = event.data.order.order_id;
    await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "FAILED" })
      .eq("order_id", orderId);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
```

**Webhook Signature Verification Flow**:

```
1. Extract timestamp and signature from headers
2. Concatenate: signedPayload = timestamp + rawBody
3. Compute HMAC-SHA256 with secret key
4. Compare computed signature with received signature
5. Process event only if signatures match
```

**Webhook Event Types**:

| Event Type | Description |
|------------|-------------|
| `PAYMENT_SUCCESS` | Payment completed successfully |
| `PAYMENT_FAILED` | Payment failed or declined |
| `PAYMENT_USER_DROPPED` | User abandoned payment |
| `REFUND_STATUS_WEBHOOK` | Refund status update |

---

### 5. Database Integration

**Client-side Supabase** (`lib/supabase.ts`):

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY! // anon key
);
```

**Admin Supabase** (`lib/supabase-admin.ts`):

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔥 SECRET - bypasses RLS
);
```

**Why Two Clients?**
- **`supabase`**: Uses anon key, respects Row Level Security (RLS)
- **`supabaseAdmin`**: Uses service role key, bypasses RLS for webhook updates

---

## Integration Flow

```
┌──────┐      ┌──────────┐      ┌────────────────┐      ┌──────────┐
│ User │      │ Frontend │      │ Create Order   │      │ Cashfree │
└──┬───┘      └────┬─────┘      │ API            │      └────┬─────┘
   │               │            └───────┬────────┘           │
   │ Click "Book"  │                    │                    │
   │──────────────▶│                    │                    │
   │               │ POST /create-order │                    │
   │               │───────────────────▶│                    │
   │               │                    │ PGCreateOrder()    │
   │               │                    │───────────────────▶│
   │               │                    │◀───────────────────│
   │               │                    │ payment_session_id │
   │               │◀───────────────────│                    │
   │               │                    │                    │
   │               │ cashfree.checkout()│                    │
   │               │───────────────────────────────────────▶│
   │               │                    │                    │
   │ Complete Pay  │                    │                    │
   │──────────────────────────────────────────────────────▶│
   │               │                    │                    │
   │               │      ┌─────────────────────┐           │
   │               │      │ Webhook Handler     │◀──────────│
   │               │      │ /api/cashfree-webhook│          │
   │               │      └──────────┬──────────┘           │
   │               │                 │                      │
   │               │                 │ Update Supabase      │
   │               │                 ▼                      │
   │               │      ┌─────────────────────┐           │
   │               │      │ Supabase (bookings) │           │
   │               │      │ status: PAID        │           │
   │               │      └─────────────────────┘           │
```

---

## Testing

### Sandbox Testing

1. **Enable Sandbox Mode**:
   - Use `CFEnvironment.SANDBOX` in `lib/cashfree.ts`
   - Set `mode: "sandbox"` in frontend checkout

2. **Test UPI IDs**:
   | UPI ID | Behavior |
   |--------|----------|
   | `testsuccess@gocash` | Payment succeeds |
   | `testfailure@gocash` | Payment fails |

3. **Webhook Testing**:
   - Use [ngrok](https://ngrok.com) to expose localhost:
     ```bash
     ngrok http 3000
     ```
   - Configure webhook URL in Cashfree dashboard:
     ```
     https://your-ngrok-url.ngrok.io/api/cashfree-webhook
     ```

4. **Test Webhook Locally**:
   ```bash
   curl -X POST http://localhost:3000/api/cashfree-webhook \
     -H "Content-Type: application/json" \
     -d '{"type":"PAYMENT_SUCCESS","data":{"order":{"order_id":"BOOK_123"}}}'
   ```

### Admin Dashboard

View all bookings at `/admin`:

```typescript
export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";

export default async function Admin() {
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1>Admin – Bookings</h1>
      {data?.map(b => (
        <div key={b.id}>
          {b.package_name} – {b.payment_status}
        </div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `payment_session_id` undefined | Order creation failed | Check Cashfree credentials and API logs |
| Webhook signature mismatch | Incorrect secret key | Verify `CASHFREE_SECRET_KEY` matches dashboard |
| Booking not updating | RLS blocking updates | Use `supabaseAdmin` with service role key |
| Checkout not opening | SDK not loaded | Ensure script tag in `layout.tsx` |
| 401 on webhook | Signature verification failed | Check timestamp + body concatenation |

### Debug Logging

Add logging to webhook handler:

```typescript
console.log("Headers:", {
  signature,
  timestamp,
});
console.log("Raw body:", rawBody);
console.log("Expected signature:", expectedSignature);
```

---

## Security Considerations

⚠️ **Critical Security Notes**:

1. **Never expose `CASHFREE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the client**
2. **Always verify webhook signatures** before processing events
3. **Use environment variables** for all sensitive credentials
4. **Implement rate limiting** on API routes in production
5. **Add CORS restrictions** for production deployments

**Ensure `.gitignore` includes**:
```gitignore
.env*
.env.local
```

---

## Project Structure

```
cashfree-booking/
├── app/
│   ├── api/
│   │   ├── create-order/
│   │   │   └── route.ts      # Order creation endpoint
│   │   └── cashfree-webhook/
│   │       └── route.ts      # Webhook handler
│   ├── admin/
│   │   └── page.tsx          # Admin dashboard
│   ├── success/
│   │   └── page.tsx          # Success page
│   ├── layout.tsx            # Root layout with Cashfree SDK
│   ├── page.tsx              # Home page with checkout
│   └── globals.css
├── lib/
│   ├── cashfree.ts           # Cashfree SDK initialization
│   ├── supabase.ts           # Supabase client (anon key)
│   └── supabase-admin.ts     # Supabase admin client (service key)
├── .env.local                # Environment variables
└── package.json
```

---

## Conclusion

This integration demonstrates a complete Cashfree payment flow:

- ✅ Server-side order creation with unique order IDs
- ✅ Client-side checkout modal with payment method restrictions
- ✅ Secure webhook handling with HMAC signature verification
- ✅ Database persistence for booking management
- ✅ Admin dashboard for viewing transactions

### Further Resources

- [Cashfree PG Documentation](https://docs.cashfree.com/docs/payment-gateway)
- [Cashfree Webhook Guide](https://docs.cashfree.com/docs/webhooks)
- [Cashfree Test Cards & UPIs](https://docs.cashfree.com/docs/test-data)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## License

This project is provided as a reference implementation for educational purposes.

---

*Built with Next.js 16, Cashfree PG SDK, and Supabase*