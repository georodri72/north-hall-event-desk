import type { Metadata } from "next";
import { RoomsManager } from "@/components/rooms-manager";
import { listRooms } from "@/lib/store";

export const metadata: Metadata = { title: "Rooms" };
export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const rooms = await listRooms();
  return <RoomsManager rooms={rooms} />;
}
