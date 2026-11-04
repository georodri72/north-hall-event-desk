import { jsonResult, requireUser, unauthorized } from "@/lib/http";
import { saveBooking } from "@/lib/store";

export async function POST(request: Request) {
  if (!(await requireUser())) return unauthorized();
  const result = await saveBooking(await request.json().catch(() => null));
  return jsonResult(result.status, result.body);
}
