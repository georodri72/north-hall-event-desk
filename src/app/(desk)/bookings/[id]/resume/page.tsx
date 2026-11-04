import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResumeStudio } from "@/components/resume-studio";
import { prisma } from "@/lib/db";
import { buildResume, toBookingDTO, toRoomDTO } from "@/lib/model";

export const metadata: Metadata = { title: "Event résumé" };
export const dynamic = "force-dynamic";

export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.booking.findUnique({ where: { id }, include: { room: true } });
  if (!row) notFound();
  const resume = buildResume(toBookingDTO(row), toRoomDTO(row.room));
  return <ResumeStudio initial={resume} />;
}
