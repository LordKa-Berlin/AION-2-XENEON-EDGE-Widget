import test from "node:test";
import assert from "node:assert/strict";
import { SCHEDULES, defaultSettings, formatRemaining, nextMany, nextOccurrence, zonedParts } from "../widget/scripts/schedule.mjs";
import { formatTimer, normalizeTimer, setTimerDuration, timerRemaining, toggleTimer } from "../widget/scripts/timers.mjs";

const byId = id => SCHEDULES.find(item => item.id === id);

test("Shugofesta folgt zur nächsten vollen EU-Stunde", () => {
  const target = nextOccurrence(byId("shugofesta"), new Date("2026-10-18T10:31:12Z"));
  assert.deepEqual(zonedParts(target), { year: 2026, month: 10, day: 18, weekday: 0, hour: 13, minute: 0, second: 0 });
});

test("Raum-Zeit-Riss verwendet die acht dreistündlichen EU-Termine", () => {
  const target = nextOccurrence(byId("rift"), new Date("2026-10-18T10:31:12Z"));
  assert.equal(zonedParts(target).hour, 14);
  assert.equal(zonedParts(target).minute, 0);
});

test("Wochenplan findet den nächsten Belagerungsboss", () => {
  const target = nextOccurrence(byId("siege"), new Date("2026-10-18T10:31:12Z"));
  const parts = zonedParts(target);
  assert.equal(parts.weekday, 1);
  assert.equal(parts.hour, 21);
  assert.equal(parts.minute, 30);
});

test("Nächste fünf sind chronologisch und enthalten parallele Termine", () => {
  const values = nextMany(SCHEDULES, new Date("2026-10-18T10:31:12Z"), 5);
  assert.equal(values.length, 5);
  assert.ok(values.every((item, index) => index === 0 || item.target >= values[index - 1].target));
  const groups = Map.groupBy(values, item => item.target.getTime());
  assert.ok([...groups.values()].some(group => group.length === 3));
});

test("Restzeit wird kompakt formatiert", () => {
  assert.equal(formatRemaining(4 * 60_000 + 8_000), "00:04:08");
  assert.equal(formatRemaining(25 * 60 * 60_000), "1 T 01:00:00");
});

test("Touch-Timer startet, pausiert und setzt die Restzeit fort", () => {
  const initial = normalizeTimer(null, { durationSeconds: 300, remainingSeconds: 300, running: false, endsAt: null });
  const running = toggleTimer(initial, 1_000);
  assert.equal(timerRemaining(running, 61_000), 240);
  const paused = toggleTimer(running, 61_000);
  assert.deepEqual(paused, { durationSeconds: 300, remainingSeconds: 240, running: false, endsAt: null });
  assert.equal(timerRemaining(toggleTimer(paused, 80_000), 90_000), 230);
});

test("Neue Timer-Startzeit stoppt und setzt den Countdown zurück", () => {
  const changed = setTimerDuration({ durationSeconds: 300, remainingSeconds: 100, running: true, endsAt: 50_000 }, 3723);
  assert.deepEqual(changed, { durationSeconds: 3723, remainingSeconds: 3723, running: false, endsAt: null });
  assert.equal(formatTimer(changed.remainingSeconds), "01:02:03");
});

test("AION-2-Grafiken sind standardmäßig eingeschaltet und konfigurierbar", () => {
  assert.equal(defaultSettings().showArtwork, true);
});
