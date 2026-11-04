import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="font-serif text-4xl">That page is not on the desk</h1>
      <p className="mt-3 text-lg text-muted-foreground">The event or room may have been removed.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-primary">
        Back to the calendar
      </Link>
    </div>
  );
}
