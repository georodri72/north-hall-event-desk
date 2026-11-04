import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking-form";
import { conflictsFor, getBooking, listRooms } from "@/lib/store";

export const metadata: Metadata = { title: "Event" };
export const dynamic = "force-dynamic";

export default async function EditBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const booking = await getBooking(id);
  if (!booking) notFound();
  const rooms = await listRooms();
  const initialConflicts = await conflictsFor(booking);
  return (
    <BookingForm
      rooms={rooms}
      booking={booking}
      justSaved={query.saved === "1"}
      cancelled={booking.status === "cancelled"}
      initialConflicts={initialConflicts}
    />
  );
}
