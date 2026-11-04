import { jsonResult, requireUser, unauthorized } from "@/lib/http";
import { saveRoom } from "@/lib/store";

export async function POST(request: Request) {
  if (!(await requireUser())) return unauthorized();
  const result = await saveRoom(await request.json().catch(() => null));
  return jsonResult(result.status, result.body);
}
