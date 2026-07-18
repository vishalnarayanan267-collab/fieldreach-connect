// Minimal RFC 5545 iCalendar generator + client-side downloader.
// No external email infra required — worker taps the .ics on mobile and
// Google/Apple Calendar imports it natively.

export type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD (all-day)
  endDate?: string;  // YYYY-MM-DD (exclusive); defaults to startDate + 1
  organizer?: { name?: string; email?: string };
  attendee?: { name?: string; email?: string };
};

function esc(v = ""): string {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function ymd(d: string): string {
  return d.replaceAll("-", "");
}
function addDay(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}
function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcs(ev: IcsEvent): string {
  const dtStart = ymd(ev.startDate);
  const dtEnd = ymd(ev.endDate ?? addDay(ev.startDate));
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lifecare Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@lifecare.portal`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${esc(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${esc(ev.location)}`);
  if (ev.organizer?.email) lines.push(`ORGANIZER;CN=${esc(ev.organizer.name ?? "Admin")}:mailto:${ev.organizer.email}`);
  if (ev.attendee?.email) lines.push(`ATTENDEE;CN=${esc(ev.attendee.name ?? "Worker")};RSVP=FALSE:mailto:${ev.attendee.email}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(ev: IcsEvent, filename?: string): void {
  const ics = buildIcs(ev);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `lifecare-${ev.uid}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
