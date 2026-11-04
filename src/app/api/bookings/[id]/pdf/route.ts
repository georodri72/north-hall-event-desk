import { prisma } from "@/lib/db";
import { unauthorized, requireUser } from "@/lib/http";
import { buildResume, toBookingDTO, toRoomDTO } from "@/lib/model";
import { renderResumePdf } from "@/lib/pdf";

type Context = { params: Promise<{ id: string }> };

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "event";
}

export async function GET(_request: Request, context: Context) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await context.params;
  const row = await prisma.booking.findUnique({ where: { id }, include: { room: true } });
  if (!row) return new Response("Event not found", { status: 404 });
  const resume = buildResume(toBookingDTO(row), toRoomDTO(row.room));
  const bytes = await renderResumePdf(resume);
  const filename = `North-Hall-${slug(resume.eventName)}-${row.date}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
