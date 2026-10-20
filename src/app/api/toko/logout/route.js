import { hapusSesiToko } from "@/lib/server/tokoAuth";

export async function POST() {
  await hapusSesiToko();
  return Response.json({ berhasil: true });
}
