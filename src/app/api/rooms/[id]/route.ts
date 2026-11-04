import { jsonResult, requireUser, unauthorized } from "@/lib/http";
import { deleteRoom, saveRoom } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await context.params;
  const result = await saveRoom(await request.json().catch(() => null), id);
  return jsonResult(result.status, result.body);
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await context.params;
  const result = await deleteRoom(id);
  return jsonResult(result.status, result.body);
}
