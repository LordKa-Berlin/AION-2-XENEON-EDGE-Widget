export const ZONE = "Europe/Berlin";

export const SCHEDULES = Object.freeze([
  { id: "beritra", category: "Dimensionsinvasion", name: "Beritra-Luftangriff", rule: "Stündlich um :30", kind: "hourly", minute: 30 },
  { id: "accursed-sword", category: "Dimensionsinvasion", name: "Accursed Sword", rule: "Stündlich um :30", kind: "hourly", minute: 30 },
  { id: "spirit-incursion", category: "Dimensionsinvasion", name: "Incursion of the Spirits", rule: "Stündlich um :30", kind: "hourly", minute: 30 },
  { id: "rift", category: "PvP", name: "Raum-Zeit-Riss", rule: "Alle 3 Stunden", kind: "interval", hours: [2, 5, 8, 11, 14, 17, 20, 23] },
  { id: "shugofesta", category: "Event", name: "Shugofesta", rule: "Stündlich zur vollen Stunde", kind: "hourly", minute: 0 },
  { id: "abyss", category: "PvP", name: "Abyss-Eroberung", rule: "Mo., Do. und Sa. um 21:00 Uhr", kind: "weekly", hour: 21, minute: 0, days: [1, 4, 6] },
  { id: "nahma", category: "Weltboss", name: "Nahma-Zeitfenster", rule: "Fr. und So. um 21:00 Uhr", kind: "weekly", hour: 21, minute: 0, days: [5, 0] },
  { id: "siege", category: "Weltboss", name: "Belagerungsboss-Zeitfenster", rule: "Mo., Do. und Sa. um 21:30 Uhr", kind: "weekly", hour: 21, minute: 30, days: [1, 4, 6] },
  { id: "kaira", category: "Weltboss", name: "Kaira-Zeitfenster", rule: "Täglich alle 3 Stunden ab 01:00 Uhr", kind: "interval", hours: [1, 4, 7, 10, 13, 16, 19, 22] }
]);

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

export function zonedParts(value) {
  const entries = Object.fromEntries(formatter.formatToParts(value)
    .filter(part => part.type !== "literal")
    .map(part => [part.type, part.value]));
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(entries.year),
    month: Number(entries.month),
    day: Number(entries.day),
    weekday: weekdays[entries.weekday],
    hour: Number(entries.hour),
    minute: Number(entries.minute),
    second: Number(entries.second)
  };
}

export function matchesSchedule(schedule, parts) {
  if (schedule.kind === "hourly") return parts.minute === schedule.minute;
  if (schedule.kind === "interval") return schedule.hours.includes(parts.hour) && parts.minute === (schedule.minute ?? 0);
  return schedule.days.includes(parts.weekday) && parts.hour === schedule.hour && parts.minute === schedule.minute;
}

export function nextOccurrence(schedule, now = new Date()) {
  const minute = 60_000;
  let candidate = new Date(Math.floor(now.getTime() / minute) * minute + minute);
  const end = candidate.getTime() + 8 * 24 * 60 * minute;
  while (candidate.getTime() <= end) {
    if (matchesSchedule(schedule, zonedParts(candidate))) return candidate;
    candidate = new Date(candidate.getTime() + minute);
  }
  throw new Error(`Kein Termin innerhalb von acht Tagen gefunden: ${schedule.id}`);
}

export function nextMany(schedules, now = new Date(), count = 5) {
  const candidates = schedules.map(schedule => ({ schedule, target: nextOccurrence(schedule, now) }));
  const result = [];
  while (candidates.length && result.length < count) {
    candidates.sort((a, b) => a.target - b.target || a.schedule.name.localeCompare(b.schedule.name, "de"));
    const next = candidates[0];
    result.push({ schedule: next.schedule, target: new Date(next.target) });
    next.target = nextOccurrence(next.schedule, new Date(next.target.getTime() + 1_000));
  }
  return result;
}

export function formatRemaining(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return days ? `${days} T ${clock}` : clock;
}

export function defaultSettings() {
  return {
    expanded: false,
    selectedEventId: SCHEDULES[0].id,
    events: Object.fromEntries(SCHEDULES.map(schedule => [schedule.id, {
      enabled: true,
      alarms: [
        { enabled: true, minutesBefore: 30, color: "yellow", blink: false, sound: "notice" },
        { enabled: true, minutesBefore: 15, color: "orange", blink: false, sound: "bell" },
        { enabled: true, minutesBefore: 5, color: "red", blink: true, sound: "critical" }
      ]
    }]))
  };
}
