import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { DESK } from "@/lib/catalog";
import type { ResumeModel } from "@/lib/model";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 36;

function sanitize(text: string) {
  return text
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const clean = sanitize(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderResumePdf(resume: ResumeModel): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const spruce = rgb(0.122, 0.29, 0.22);
  const ink = rgb(0.11, 0.098, 0.082);
  const muted = rgb(0.36, 0.337, 0.298);
  const rule = rgb(0.78, 0.75, 0.7);
  const clay = rgb(0.604, 0.231, 0.157);
  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  const contentW = PAGE_W - MARGIN * 2;

  const footer = (target: PDFPage) => {
    target.drawText(sanitize(`${DESK.property}  ·  Internal event resume  ·  ${DESK.timezoneLabel}`), {
      x: MARGIN,
      y: 22,
      size: 8,
      font,
      color: muted,
    });
  };

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 36;
    const running = sanitize(`${resume.eventName}  ·  ${resume.dateLabel}`);
    page.drawText(running, { x: MARGIN, y: PAGE_H - 28, size: 9, font: bold, color: spruce });
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - 34 },
      end: { x: PAGE_W - MARGIN, y: PAGE_H - 34 },
      thickness: 0.6,
      color: rule,
    });
    y = PAGE_H - 52;
  };

  const ensure = (height: number) => {
    if (y - height < 40) newPage();
  };

  const text = (value: string, x: number, size: number, face: PDFFont, color = ink) => {
    page.drawText(sanitize(value), { x, y, size, font: face, color });
  };

  page.drawRectangle({ x: 0, y: PAGE_H - 52, width: PAGE_W, height: 52, color: spruce });
  page.drawText("NORTH HALL CONFERENCE CENTER", {
    x: MARGIN,
    y: PAGE_H - 20,
    size: 8,
    font,
    color: rgb(1, 1, 1),
  });
  page.drawText("Event resume", {
    x: MARGIN,
    y: PAGE_H - 38,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  });
  const beo = "BEO";
  page.drawText(beo, {
    x: PAGE_W - MARGIN - bold.widthOfTextAtSize(beo, 12),
    y: PAGE_H - 36,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y = PAGE_H - 70;

  ensure(22);
  text(resume.eventName, MARGIN, 14, bold);
  y -= 16;
  text(`${resume.dateLabel}   ·   ${resume.timeLabel}   ·   ${resume.statusLabel}`, MARGIN, 9, font, muted);
  y -= 12;
  page.drawLine({
    start: { x: MARGIN, y: y + 6 },
    end: { x: PAGE_W - MARGIN, y: y + 6 },
    thickness: 0.8,
    color: rule,
  });
  y -= 8;

  const meta = [
    ["Room", `${resume.roomName}, ${resume.floor}`],
    ["Setup", resume.setupStyleLabel],
    ["Guests", resume.capacity != null ? `${resume.headcount} / ${resume.capacity}` : String(resume.headcount)],
    ["Hold", resume.bufferLabel],
    ["Group", resume.organization || "—"],
    ["Requester", [resume.requesterName, resume.requesterPhone, resume.requesterEmail].filter(Boolean).join("  ·  ")],
  ];
  for (const [label, value] of meta) {
    const lines = wrap(value, font, 9, contentW - 70);
    ensure(lines.length * 11 + 1);
    text(label.toUpperCase(), MARGIN, 8, bold, spruce);
    let lineY = y;
    for (const line of lines.length ? lines : ["-"]) {
      page.drawText(sanitize(line), { x: MARGIN + 70, y: lineY, size: 9, font, color: ink });
      lineY -= 11;
    }
    y = lineY;
  }

  const section = (title: string) => {
    ensure(22);
    y -= 4;
    text(title.toUpperCase(), MARGIN, 8, bold, spruce);
    y -= 3;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.6,
      color: rule,
    });
    y -= 12;
  };

  const paragraph = (value: string, size = 9) => {
    const lines = wrap(value, font, size, contentW);
    if (!lines.length) return;
    ensure(lines.length * (size + 2));
    for (const line of lines) {
      text(line, MARGIN, size, font);
      y -= size + 2;
    }
  };

  section("Timeline");
  for (const item of resume.timeline) {
    const lines = wrap(item.label, font, 9, contentW - 78);
    ensure(Math.max(12, lines.length * 11));
    text(item.timeLabel, MARGIN, 9, bold);
    let lineY = y;
    for (const line of lines) {
      page.drawText(sanitize(line), { x: MARGIN + 78, y: lineY, size: 9, font, color: ink });
      lineY -= 11;
    }
    y = lineY;
  }

  section("Room and setup");
  paragraph(resume.roomSetupText);
  if (resume.overCapacity) {
    ensure(16);
    text(`Headcount is over the posted ${resume.setupStyleLabel.toLowerCase()} capacity.`, MARGIN, 9, bold, clay);
    y -= 12;
  }
  paragraph(`House equipment: ${resume.builtInAv || "None listed."}`);

  section("AV");
  for (const line of resume.avLines) {
    ensure(14);
    text(`${line.label}  -  ${line.detail}`, MARGIN, 9, font);
    y -= 11;
  }
  if (resume.avNotes) paragraph(resume.avNotes);

  section("Catering");
  if (!resume.catering.length) {
    paragraph("No food or beverage service on this event.");
  } else {
    for (const meal of resume.catering) {
      const detail = `${meal.timeLabel}   ${meal.meal}   ${meal.count} covers${meal.notes ? `   ${meal.notes}` : ""}`;
      const lines = wrap(detail, font, 9, contentW);
      ensure(lines.length * 11);
      for (const line of lines) {
        text(line, MARGIN, 9, font);
        y -= 11;
      }
    }
  }

  section("Contacts");
  paragraph(`Requester: ${resume.requesterName}${resume.organization ? `, ${resume.organization}` : ""}`);
  paragraph([resume.requesterPhone, resume.requesterEmail].filter(Boolean).join("   ") || "No requester phone or email.");
  const onsite = [resume.onsiteName, resume.onsitePhone, resume.onsiteEmail].filter(Boolean).join("   ");
  paragraph(`On-site contact: ${onsite || "Not listed."}`);
  paragraph(`North Hall: ${DESK.coordinator}, ${DESK.title}, ${DESK.phone}`);

  if (resume.narrative) {
    section("Service notes");
    paragraph(resume.narrative);
  }
  section("Notes");
  paragraph(resume.notes || "No additional notes.");

  const pages = doc.getPages();
  pages.forEach((target, index) => {
    footer(target);
    const label = `Page ${index + 1} of ${pages.length}`;
    const width = font.widthOfTextAtSize(label, 8);
    target.drawText(label, {
      x: PAGE_W - MARGIN - width,
      y: 22,
      size: 8,
      font,
      color: muted,
    });
  });

  return doc.save();
}
