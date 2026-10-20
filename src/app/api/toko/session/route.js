import { bacaSesiToko } from "@/lib/server/tokoAuth";

export async function GET(request) {
  const toko = bacaSesiToko(request);
  if (!toko) {
    return Response.json({ toko: null }, { status: 401 });
  }
  return Response.json({ toko });
}
