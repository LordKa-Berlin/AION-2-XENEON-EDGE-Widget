import test from "node:test";
import assert from "node:assert/strict";
import { SCHEDULES, formatRemaining, nextMany, nextOccurrence, zonedParts } from "../widget/scripts/schedule.mjs";

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
