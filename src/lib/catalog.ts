export const DESK = {
  property: "North Hall Conference Center",
  short: "North Hall",
  product: "Event desk",
  coordinator: "SV",
  title: "Production Coordinator",
  phone: "ext. 2100",
  timezone: "America/Chicago",
  timezoneLabel: "Central Time",
  demoEmail: "sv@northhall.example",
  demoPassword: "harbor-demo",
} as const;

export const SETUP_STYLES = [
  { id: "theater", label: "Theater" },
  { id: "classroom", label: "Classroom" },
  { id: "u-shape", label: "U-shape" },
  { id: "boardroom", label: "Boardroom" },
  { id: "rounds", label: "Rounds" },
  { id: "reception", label: "Reception" },
] as const;

export type SetupStyle = (typeof SETUP_STYLES)[number]["id"];

export const AV_CATALOG = [
  { id: "podium_mic", label: "Podium microphone", qty: true },
  { id: "lav", label: "Lavalier microphone", qty: true },
  { id: "handheld", label: "Handheld microphone", qty: true },
  { id: "house_sound", label: "House sound / playback", qty: false },
  { id: "projector", label: "Projector and screen", qty: false },
  { id: "confidence", label: "Confidence monitor", qty: false },
  { id: "laptop", label: "Presentation laptop", qty: false },
  { id: "clicker", label: "Clicker", qty: false },
  { id: "videoconf", label: "Video conference", qty: false },
  { id: "livestream", label: "Livestream", qty: false },
  { id: "recording", label: "Recording", qty: false },
  { id: "stage_wash", label: "Stage wash / uplighting", qty: false },
  { id: "flipchart", label: "Flip chart", qty: true },
  { id: "whiteboard", label: "Whiteboard", qty: false },
] as const;

export type AvId = (typeof AV_CATALOG)[number]["id"];

export const MEAL_TYPES = [
  "Breakfast",
  "AM break",
  "Lunch",
  "PM break",
  "Reception",
  "Dinner",
  "Beverage service",
  "Other",
] as const;

export const STATUSES = [
  { id: "confirmed", label: "Confirmed" },
  { id: "tentative", label: "Tentative" },
] as const;

export type BookingStatus = "confirmed" | "tentative" | "cancelled";

export function styleLabel(id: string): string {
  return SETUP_STYLES.find((style) => style.id === id)?.label ?? id;
}

export function avLabel(id: string): string {
  return AV_CATALOG.find((item) => item.id === id)?.label ?? id;
}

export function isSetupStyle(value: string): value is SetupStyle {
  return SETUP_STYLES.some((style) => style.id === value);
}
