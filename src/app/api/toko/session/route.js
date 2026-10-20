import { bacaSesiToko } from "@/lib/server/tokoAuth";

export async function GET(request) {
  const toko = bacaSesiToko(request);
  return Response.json({ toko });
}
