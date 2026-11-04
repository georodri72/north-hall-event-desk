import { jsonResult, requireUser, unauthorized } from "@/lib/http";
import { cancelBooking, deleteBooking, saveBooking } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (body && typeof body === "object" && "cancel" in body && body.cancel === true) {
    const result = await cancelBooking(id);
    return jsonResult(result.status, result.body);
  }
  const result = await saveBooking(body, id);
  return jsonResult(result.status, result.body);
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await context.params;
  const result = await deleteBooking(id);
  return jsonResult(result.status, result.body);
}
