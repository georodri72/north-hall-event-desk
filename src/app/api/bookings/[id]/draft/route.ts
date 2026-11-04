import { prisma } from "@/lib/db";
import { jsonResult, requireUser, unauthorized } from "@/lib/http";
import { draftWithModel, modelConfigured } from "@/lib/llm";
import { buildResume, templateDraft, toBookingDTO, toRoomDTO } from "@/lib/model";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await context.params;
  const row = await prisma.booking.findUnique({ where: { id }, include: { room: true } });
  if (!row) return jsonResult(404, { ok: false, message: "That event is no longer on the books." });

  const booking = toBookingDTO(row);
  const room = toRoomDTO(row.room);
  const hadKey = modelConfigured();
  const fromModel = await draftWithModel(booking, room);
  const draft = fromModel ?? templateDraft(booking, room);
  const draftSource = fromModel ? "openai" : "template";
  const updated = await prisma.booking.update({
    where: { id },
    data: {
      timeline: JSON.stringify(draft.timeline),
      narrative: draft.narrative,
      draftSource,
    },
    include: { room: true },
  });
  const next = toBookingDTO(updated);
  const message = fromModel
    ? "Drafted from the notes with OpenAI."
    : hadKey
      ? "The model request failed, so this draft used the built-in template."
      : "Drafted from the event and notes with the built-in template. Set OPENAI_API_KEY to use a model.";

  return jsonResult(200, {
    ok: true,
    message,
    draftSource,
    resume: buildResume(next, toRoomDTO(updated.room)),
  });
}
