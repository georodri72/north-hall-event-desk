import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { styleLabel } from "@/lib/catalog";
import { listPastBookings } from "@/lib/store";
import { mediumDate, venueNowMinutes, venueToday } from "@/lib/time";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const today = venueToday();
  const now = venueNowMinutes();
  const events = await listPastBookings();
  const past = events.filter((event) => event.date < today || (event.date === today && event.endMin <= now));
  const needle = query.toLowerCase();
  const filtered = past.filter((event) => {
    if (!needle) return true;
    return [event.eventName, event.organization, event.requesterName, event.roomName]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl tracking-tight">History</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
          Past events stay searchable. Duplicate one to start the next occurrence, then pick a new date.
        </p>
      </div>
      <form className="flex flex-wrap gap-2" action="/history">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search events, groups, requesters, rooms"
          aria-label="Search past events"
          className="h-11 max-w-xl flex-1 rounded-lg border border-input bg-card px-3 text-base"
        />
        <Button type="submit">Search</Button>
        {query ? (
          <Button variant="outline" render={<Link href="/history" />}>
            Clear
          </Button>
        ) : null}
      </form>
      <p className="text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "event" : "events"}
        {query ? ` matching “${query}”` : ""}
      </p>
      {filtered.length === 0 ? (
        <p className="rounded-xl bg-card px-5 py-8 text-lg ring-1 ring-foreground/10">
          {query ? "Nothing in the history matches that search." : "Past events will collect here after they end."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-border text-sm tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Room</th>
                <th className="px-4 py-3 font-semibold">Guests</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap">{mediumDate(event.date)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/bookings/${event.id}`} className="font-semibold text-primary">
                      {event.eventName}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {event.organization || event.requesterName} · {styleLabel(event.setupStyle)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {event.roomName}
                    <div className="text-sm text-muted-foreground">{event.floor}</div>
                  </td>
                  <td className="px-4 py-3">{event.headcount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" render={<Link href={`/bookings/${event.id}/resume`} />}>
                        Résumé
                      </Button>
                      <Button render={<Link href={`/bookings/new?from=${event.id}`} />}>Duplicate</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
