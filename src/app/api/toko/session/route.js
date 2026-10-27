import { bacaSesiToko } from "@/lib/server/tokoAuth";

export async function GET(request) {
  const toko = await bacaSesiToko(request);
  return Response.json({ toko });
}
