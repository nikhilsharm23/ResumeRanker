import { loadPile } from "../../../lib/pile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results = await loadPile();
  return Response.json(results);
}