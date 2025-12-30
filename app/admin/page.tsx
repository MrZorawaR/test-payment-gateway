import { supabase } from "@/lib/supabase";

export default async function Admin() {
  const { data } = await supabase.from("bookings").select("*");

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
