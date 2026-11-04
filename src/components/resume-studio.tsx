"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DESK } from "@/lib/catalog";
import type { ResumeModel } from "@/lib/model";
import { toHHMM } from "@/lib/time";

export function ResumeStudio({ initial }: { initial: ResumeModel }) {
  const [resume, setResume] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<"draft" | "save" | "pdf" | null>(null);
  const [notice, setNotice] = useState(
    initial.drafted
      ? initial.draftSource === "openai"
        ? "This résumé was drafted with OpenAI."
        : "This résumé includes a saved draft. Draft again to rebuild it from the notes."
      : "Showing a schedule outline. Draft from notes to fold in the coordinator notes.",
  );
  const [error, setError] = useState("");

  function touch(next: ResumeModel) {
    setResume(next);
    setDirty(true);
  }

  async function draft() {
    setPending("draft");
    setError("");
    const response = await fetch(`/api/bookings/${resume.id}/draft`, { method: "POST" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || "The draft did not save.");
      setPending(null);
      return;
    }
    setResume(body.resume);
    setNotice(body.message);
    setDirty(false);
    setPending(null);
  }

  async function save() {
    setPending("save");
    setError("");
    const response = await fetch(`/api/bookings/${resume.id}/resume`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeline: resume.timeline.map((item) => ({ id: item.id, timeMin: item.timeMin, label: item.label })),
        narrative: resume.narrative,
        notes: resume.notes,
        onsiteName: resume.onsiteName,
        onsitePhone: resume.onsitePhone,
        onsiteEmail: resume.onsiteEmail,
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message || "The résumé was not saved.");
      setPending(null);
      return;
    }
    setResume(body.resume);
    setDirty(false);
    setNotice("Résumé saved.");
    setPending(null);
    return true;
  }

  async function download() {
    setPending("pdf");
    setError("");
    if (dirty) {
      const saved = await save();
      if (!saved) return;
    }
    const response = await fetch(`/api/bookings/${resume.id}/pdf`);
    if (!response.ok) {
      setError("The PDF did not generate.");
      setPending(null);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = /filename="([^"]+)"/.exec(disposition);
    link.href = url;
    link.download = match?.[1] || "event-resume.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setPending(null);
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" render={<Link href={`/bookings/${resume.id}`} />}>
          Back to the event
        </Button>
        <Button type="button" onClick={draft} disabled={pending !== null}>
          {pending === "draft" ? "Drafting…" : "Draft from notes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setEditing((value) => !value)}>
          {editing ? "Hide edits" : "Adjust timeline"}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print
        </Button>
        <Button type="button" onClick={download} disabled={pending !== null}>
          {pending === "pdf" ? "Preparing PDF…" : "Download PDF"}
        </Button>
      </div>
      {notice ? <p className="no-print rounded-lg bg-accent px-4 py-3">{notice}</p> : null}
      {error ? <p className="no-print font-medium text-clay">{error}</p> : null}
      {editing ? (
        <div className="no-print space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          {resume.timeline.map((item, index) => (
            <div key={item.id} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
              <Input
                type="time"
                value={toHHMM(item.timeMin)}
                aria-label={`Time for row ${index + 1}`}
                onChange={(event) => {
                  const [hour, minute] = event.target.value.split(":").map(Number);
                  const timeMin = hour * 60 + minute;
                  touch({
                    ...resume,
                    timeline: resume.timeline.map((row) => (row.id === item.id ? { ...row, timeMin, timeLabel: event.target.value } : row)),
                  });
                }}
              />
              <Input
                value={item.label}
                aria-label={`Label for row ${index + 1}`}
                onChange={(event) =>
                  touch({
                    ...resume,
                    timeline: resume.timeline.map((row) => (row.id === item.id ? { ...row, label: event.target.value } : row)),
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => touch({ ...resume, timeline: resume.timeline.filter((row) => row.id !== item.id) })}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              touch({
                ...resume,
                timeline: [
                  ...resume.timeline,
                  { id: crypto.randomUUID(), timeMin: 9 * 60, timeLabel: "9:00 AM", label: "New cue" },
                ],
              })
            }
          >
            Add a row
          </Button>
          <label className="block space-y-2">
            <span className="font-semibold">Service notes</span>
            <Textarea value={resume.narrative} onChange={(event) => touch({ ...resume, narrative: event.target.value })} />
          </label>
          <label className="block space-y-2">
            <span className="font-semibold">Notes</span>
            <Textarea value={resume.notes} onChange={(event) => touch({ ...resume, notes: event.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={resume.onsiteName} placeholder="On-site name" onChange={(event) => touch({ ...resume, onsiteName: event.target.value })} />
            <Input value={resume.onsitePhone} placeholder="On-site phone" onChange={(event) => touch({ ...resume, onsitePhone: event.target.value })} />
            <Input value={resume.onsiteEmail} placeholder="On-site email" onChange={(event) => touch({ ...resume, onsiteEmail: event.target.value })} />
          </div>
          <Button type="button" onClick={save} disabled={pending !== null || !dirty}>
            {pending === "save" ? "Saving…" : "Save résumé"}
          </Button>
        </div>
      ) : null}
      <ResumeSheet resume={resume} />
    </div>
  );
}

export function ResumeSheet({ resume }: { resume: ResumeModel }) {
  return (
    <article className="sheet mx-auto max-w-3xl rounded-xl border-t-8 border-primary bg-white px-6 py-7 text-foreground shadow-md md:px-10">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-brass uppercase">{DESK.property}</p>
          <h1 className="mt-1 font-serif text-4xl leading-tight">{resume.eventName}</h1>
          <p className="mt-2 text-lg">
            {resume.dateLabel}
            <br />
            {resume.timeLabel} · {resume.statusLabel}
          </p>
        </div>
        <p className="font-serif text-2xl text-primary">BEO</p>
      </header>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Fact term="Room" value={`${resume.roomName}, ${resume.floor}`} />
        <Fact term="Setup" value={resume.setupStyleLabel} />
        <Fact term="Guests" value={resume.capacity != null ? `${resume.headcount} of ${resume.capacity}` : String(resume.headcount)} />
        <Fact term="Hold" value={resume.bufferLabel} />
      </dl>
      {resume.overCapacity ? (
        <p className="mt-3 font-semibold text-clay">Headcount is over the posted {resume.setupStyleLabel.toLowerCase()} capacity.</p>
      ) : null}

      <Section title="Timeline">
        <ol className="space-y-1.5">
          {resume.timeline.map((item) => (
            <li key={item.id} className="grid grid-cols-[7.5rem_1fr] gap-3">
              <span className="font-semibold">{item.timeLabel}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Room and setup">
        <p>{resume.roomSetupText}</p>
        <p className="mt-2">House equipment: {resume.builtInAv || "None listed."}</p>
      </Section>

      <Section title="AV">
        <ul className="space-y-1">
          {resume.avLines.map((line) => (
            <li key={line.label}>
              <span className="font-semibold">{line.label}</span>
              <span className="text-muted-foreground"> — {line.detail}</span>
            </li>
          ))}
        </ul>
        {resume.avNotes ? <p className="mt-2">{resume.avNotes}</p> : null}
      </Section>

      <Section title="Catering">
        {resume.catering.length === 0 ? (
          <p>No food or beverage service on this event.</p>
        ) : (
          <ul className="space-y-1">
            {resume.catering.map((meal) => (
              <li key={meal.id}>
                <span className="font-semibold">{meal.timeLabel}</span> {meal.meal} · {meal.count} covers
                {meal.notes ? ` · ${meal.notes}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Contacts">
        <p>
          <span className="font-semibold">Requester. </span>
          {resume.requesterName}
          {resume.organization ? `, ${resume.organization}` : ""}
          {[resume.requesterPhone, resume.requesterEmail].filter(Boolean).length
            ? ` · ${[resume.requesterPhone, resume.requesterEmail].filter(Boolean).join(" · ")}`
            : ""}
        </p>
        <p className="mt-1">
          <span className="font-semibold">On-site. </span>
          {[resume.onsiteName, resume.onsitePhone, resume.onsiteEmail].filter(Boolean).join(" · ") || "Not listed."}
        </p>
        <p className="mt-1">
          <span className="font-semibold">North Hall. </span>
          {DESK.coordinator}, {DESK.title}, {DESK.phone}
        </p>
      </Section>

      {resume.narrative ? (
        <Section title="Service notes">
          <p>{resume.narrative}</p>
        </Section>
      ) : null}

      <Section title="Notes">
        <p className="whitespace-pre-wrap">{resume.notes || "No additional notes."}</p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="border-b border-border pb-1 text-sm font-semibold tracking-[0.14em] text-primary uppercase">{title}</h2>
      <div className="mt-2 text-base leading-relaxed">{children}</div>
    </section>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.14em] text-brass uppercase">{term}</dt>
      <dd className="text-base">{value}</dd>
    </div>
  );
}
