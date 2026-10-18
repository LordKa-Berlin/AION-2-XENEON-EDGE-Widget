import { SCHEDULES, defaultSettings, formatRemaining, nextMany, nextOccurrence } from "./schedule.mjs";
import { formatTimer, normalizeTimer, setTimerDuration, settleTimer, timerRemaining, toggleTimer } from "./timers.mjs";

const app = document.getElementById("app");
const storageKey = typeof uniqueId !== "undefined" ? uniqueId : "aion2-termin-overlay-icue-preview";
const STORAGE_PROPERTY = "aion2TerminOverlay";
const colorValues = { yellow: "#f6d55c", orange: "#ff9f43", red: "#ff5252", cyan: "#70d7ff", purple: "#9a83ff" };
const colorLabels = { yellow: "Gelb", orange: "Orange", red: "Rot", cyan: "Cyan", purple: "Violett" };
const soundLabels = { none: "Kein Ton", notice: "Hinweis", bell: "Glocke", critical: "Kritisch" };
const dateFormatter = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

let settings = loadSettings();
let screen = "main";
let currentAlert = null;
let currentTest = null;
let occurrences = new Map();
let dismissed = new Set();
let soundPlayed = new Set();
let audioContext = null;
let audioUnlocked = false;
let renderedViewKey = "";

function mergeSettings(stored) {
  const defaults = defaultSettings();
  if (!stored || typeof stored !== "object") return defaults;
  defaults.showArtwork = stored.showArtwork !== false;
  defaults.selectedEventId = SCHEDULES.some(item => item.id === stored.selectedEventId) ? stored.selectedEventId : defaults.selectedEventId;
  defaults.utilityTimers = defaults.utilityTimers.map((fallback, index) => normalizeTimer(stored.utilityTimers?.[index], fallback));
  for (const schedule of SCHEDULES) {
    const source = stored.events?.[schedule.id];
    if (!source) continue;
    defaults.events[schedule.id].enabled = source.enabled !== false;
    source.alarms?.slice(0, 3).forEach((alarm, index) => {
      const target = defaults.events[schedule.id].alarms[index];
      target.enabled = alarm.enabled !== false;
      target.minutesBefore = Math.max(0, Math.min(1440, Number(alarm.minutesBefore) || 0));
      if (colorValues[alarm.color]) target.color = alarm.color;
      target.blink = Boolean(alarm.blink);
      if (soundLabels[alarm.sound]) target.sound = alarm.sound;
    });
  }
  return defaults;
}

function loadSettings() {
  try {
    const envelope = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return mergeSettings(envelope[STORAGE_PROPERTY]);
  } catch {
    return defaultSettings();
  }
}

function saveSettings() {
  let envelope = {};
  try { envelope = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { envelope = {}; }
  envelope[STORAGE_PROPERTY] = settings;
  localStorage.setItem(storageKey, JSON.stringify(envelope));
}

function refreshOccurrences(now = new Date()) {
  for (const schedule of SCHEDULES) {
    const existing = occurrences.get(schedule.id);
    if (!existing || existing <= now) occurrences.set(schedule.id, nextOccurrence(schedule, now));
  }
}

function enabledSchedules() {
  return SCHEDULES.filter(item => settings.events[item.id].enabled);
}

function alarmKey(schedule, target, index) {
  return `${schedule.id}|${target.toISOString()}|${index}`;
}

function chooseAlert(now) {
  if (currentTest && currentTest.target > now) return currentTest;
  if (currentTest && currentTest.target <= now) currentTest = null;
  const candidates = [];
  for (const schedule of enabledSchedules()) {
    const target = occurrences.get(schedule.id);
    const remaining = target - now;
    if (remaining <= 0) continue;
    const eligible = settings.events[schedule.id].alarms
      .map((alarm, index) => ({ alarm, index }))
      .filter(item => item.alarm.enabled && remaining <= item.alarm.minutesBefore * 60_000)
      .sort((a, b) => a.alarm.minutesBefore - b.alarm.minutesBefore);
    if (!eligible.length) continue;
    const stage = eligible[0];
    const key = alarmKey(schedule, target, stage.index);
    if (!dismissed.has(key)) candidates.push({ schedule, target, alarm: stage.alarm, alarmIndex: stage.index, key, test: false });
  }
  candidates.sort((a, b) => a.target - b.target || a.alarm.minutesBefore - b.alarm.minutesBefore || a.schedule.name.localeCompare(b.schedule.name, "de"));
  return candidates[0] || null;
}

function playTone(kind) {
  if (kind === "none") return true;
  if (!audioUnlocked) return false;
  try {
    audioContext ||= new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    const patterns = {
      notice: [[660, .11], [880, .15]],
      bell: [[880, .18], [1175, .28]],
      critical: [[440, .12], [440, .12], [880, .3]]
    };
    let offset = 0;
    for (const [frequency, duration] of patterns[kind] || patterns.notice) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = kind === "critical" ? "square" : "sine";
      gain.gain.setValueAtTime(.0001, audioContext.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(.16, audioContext.currentTime + offset + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + offset + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(audioContext.currentTime + offset);
      oscillator.stop(audioContext.currentTime + offset + duration + .02);
      offset += duration + .06;
    }
    return true;
  } catch {
    return false;
  }
}

function unlockAudio() {
  try {
    audioContext ||= new AudioContext();
    audioContext.resume().then(() => { audioUnlocked = true; });
  } catch { /* Berechtigung kann in iCUE abgelehnt worden sein. */ }
}

function formatTarget(target) {
  return `${dateFormatter.format(target).replace(",", " ·")} Uhr`;
}

function nextRows(now) {
  return nextMany(enabledSchedules(), now, 40).map(item => `
    <div class="next-row" data-target="${item.target.toISOString()}">
      ${settings.showArtwork ? `<img class="event-thumb" src="resources/event-${item.schedule.id}-v1.jpg" alt="">` : `<span class="event-marker" aria-hidden="true"></span>`}
      <div class="next-copy"><div class="next-name">${item.schedule.name}</div><div class="next-time">${formatTarget(item.target)}</div></div>
      <div class="next-remaining">${formatRemaining(item.target - now)}</div>
    </div>`).join("");
}

function updateClocks(now) {
  const countdown = app.querySelector(".countdown[data-target]");
  if (countdown) countdown.textContent = formatRemaining(new Date(countdown.dataset.target) - now);
  app.querySelectorAll(".next-row[data-target]").forEach(row => {
    const value = row.querySelector(".next-remaining");
    if (value) value.textContent = formatRemaining(new Date(row.dataset.target) - now);
  });
  let timerSettled = false;
  settings.utilityTimers = settings.utilityTimers.map(timer => {
    const settled = settleTimer(timer, now.getTime());
    timerSettled ||= settled !== timer;
    return settled;
  });
  if (timerSettled) saveSettings();
  app.querySelectorAll(".utility-timer[data-timer]").forEach(card => {
    const timer = settings.utilityTimers[Number(card.dataset.timer)];
    const value = card.querySelector(".utility-time");
    const state = card.querySelector(".utility-state");
    const remaining = timerRemaining(timer, now.getTime());
    if (value) value.textContent = formatTimer(remaining);
    if (state) state.textContent = timer.running ? "Tippen zum Stoppen" : remaining === 0 ? "Beendet · tippen zum Neustart" : "Tippen zum Starten";
    card.classList.toggle("running", timer.running);
    card.classList.toggle("finished", !timer.running && remaining === 0);
  });
}

function timerCards(now) {
  return settings.utilityTimers.map((timer, index) => {
    const remaining = timerRemaining(timer, now.getTime());
    return `<article class="utility-timer ${timer.running ? "running" : ""} ${!timer.running && remaining === 0 ? "finished" : ""}" data-timer="${index}">
      <div class="utility-head"><span><img class="timer-icon" src="resources/timer.svg" alt="">Timer ${index + 1}</span><button class="timer-set" data-action="set-timer" data-timer="${index}" aria-label="Startzeit für Timer ${index + 1} einstellen"><img src="resources/clock-edit.svg" alt="">Zeit einstellen</button></div>
      <button class="timer-touch" data-action="toggle-timer" data-timer="${index}" aria-label="Timer ${index + 1} ${timer.running ? "stoppen" : "starten"}">
        <span class="utility-time">${formatTimer(remaining)}</span>
        <span class="utility-state">${timer.running ? "Tippen zum Stoppen" : remaining === 0 ? "Beendet · tippen zum Neustart" : "Tippen zum Starten"}</span>
      </button>
    </article>`;
  }).join("");
}

function renderMain(now = new Date()) {
  refreshOccurrences(now);
  currentAlert = chooseAlert(now);
  const focus = currentAlert || (() => {
    const next = nextMany(enabledSchedules(), now, 1)[0];
    return next ? { schedule: next.schedule, target: next.target, alarm: { color: "cyan", blink: false, sound: "none" }, key: "overview" } : null;
  })();

  if (!focus) {
    app.innerHTML = `<section class="shell"><div class="topbar"><span class="eyebrow">AION 2 · EU</span></div><div class="hero"><h1>Keine Termine aktiviert</h1><p class="target">Öffne die Einstellungen und aktiviere mindestens einen Termin.</p></div><div class="actions"><button class="button primary" data-action="settings">Einstellungen</button></div></section>`;
    bindActions();
    return;
  }

  const color = colorValues[focus.alarm.color] || colorValues.cyan;
  const isAlarm = Boolean(currentAlert);
  const viewKey = `${focus.key}|${focus.target.toISOString()}|${settings.showArtwork}`;
  if (renderedViewKey === viewKey && app.querySelector(".shell")) {
    updateClocks(now);
    return;
  }
  renderedViewKey = viewKey;
  app.innerHTML = `
    <section class="shell ${focus.alarm.blink ? "blink" : ""}" style="--alarm:${color}">
      <header class="topbar">
        <span class="eyebrow">${isAlarm ? (focus.test ? "Testalarm" : focus.schedule.category) : "AION 2 · Europa"}</span>
        <span class="status-pill">${isAlarm ? `ALARM ${focus.alarmIndex + 1 || ""}` : "● LIVE"}</span>
      </header>
      <div class="content ${settings.showArtwork ? "with-artwork" : "without-artwork"}">
        <section class="left-column">
          <section class="hero">
            ${settings.showArtwork ? `<div class="hero-art" style="--hero-image:url('resources/event-${focus.schedule.id}-v1.jpg')" aria-hidden="true"></div>` : ""}
            <div class="hero-copy">
              <h1>${focus.schedule.name}</h1>
              <div class="countdown" data-target="${focus.target.toISOString()}">${formatRemaining(focus.target - now)}</div>
              <div class="target">Termin: ${formatTarget(focus.target)}</div>
              <div class="rule">${focus.schedule.rule}</div>
            </div>
          </section>
          <section class="utility-timers" aria-label="Eigene Timer">${timerCards(now)}</section>
        </section>
        <aside class="side">
          <div class="side-head">
            <div><span class="eyebrow">Termine</span><span class="list-count">${enabledSchedules().length} Pläne aktiv</span></div>
            <div class="actions">
              <button class="button settings-button" data-action="settings"><img src="resources/settings.svg" alt="">Einstellungen</button>
              ${isAlarm ? `<button class="button danger icon" data-action="dismiss" title="Alarm schließen">×</button>` : ""}
            </div>
          </div>
          <div class="next-panel"><div class="next-list">${nextRows(now)}</div></div>
        </aside>
      </div>
      <footer class="footer-note">Lokale EU-Zeit · Ingame-Anzeige bleibt maßgeblich · Tippen aktiviert die Audioausgabe</footer>
    </section>`;

  if (isAlarm && !soundPlayed.has(focus.key)) {
    if (playTone(focus.alarm.sound)) soundPlayed.add(focus.key);
  }
  bindActions();
}

function optionList(values, selected, labels) {
  return values.map(value => `<option value="${value}" ${value === selected ? "selected" : ""}>${labels[value] ?? value}</option>`).join("");
}

function renderSettings() {
  renderedViewKey = "";
  const selected = SCHEDULES.find(item => item.id === settings.selectedEventId) || SCHEDULES[0];
  const config = settings.events[selected.id];
  app.innerHTML = `
    <section class="settings">
      <header class="topbar"><div><span class="eyebrow">XENEON EDGE</span><h1>Termin-Einstellungen</h1></div><span class="sound-state">Ton nach erster Berührung verfügbar</span></header>
      <nav class="event-tabs" aria-label="Termine">
        ${SCHEDULES.map(item => `<button class="button ${item.id === selected.id ? "selected" : ""}" data-event="${item.id}">${item.name}</button>`).join("")}
      </nav>
      <div class="settings-scroll">
        <section class="display-options">
          <label class="switch"><input type="checkbox" data-show-artwork ${settings.showArtwork ? "checked" : ""}> AION-2-Grafiken anzeigen</label>
          <span class="alarm-label">Blendet das große Hintergrundmotiv und die Bilder in der Terminliste ein oder aus.</span>
        </section>
        <section class="event-card">
          <div class="setting-head"><div><div class="event-title">${selected.name}</div><div class="alarm-label">${selected.category} · ${selected.rule}</div></div><label class="switch"><input type="checkbox" data-event-enabled ${config.enabled ? "checked" : ""}> Termin aktiv</label></div>
          ${config.alarms.map((alarm, index) => `
            <div class="alarm-row" data-alarm="${index}">
              <label class="switch"><input type="checkbox" data-field="enabled" ${alarm.enabled ? "checked" : ""}> Alarm ${index + 1}</label>
              <label><span class="alarm-label">Min. vorher</span><input type="number" min="0" max="1440" step="1" value="${alarm.minutesBefore}" data-field="minutesBefore"></label>
              <label><span class="alarm-label">Farbe</span><select data-field="color">${optionList(Object.keys(colorValues), alarm.color, colorLabels)}</select></label>
              <label class="switch"><input type="checkbox" data-field="blink" ${alarm.blink ? "checked" : ""}> Blinken</label>
              <label><span class="alarm-label">Ton</span><select data-field="sound">${optionList(Object.keys(soundLabels), alarm.sound, soundLabels)}</select></label>
            </div>`).join("")}
        </section>
      </div>
      <footer class="setting-actions"><button class="button" data-action="test">Alarm testen</button><div class="actions"><button class="button" data-action="cancel">Zurück</button><button class="button primary" data-action="save">Speichern</button></div></footer>
    </section>`;
  bindSettings(selected.id);
}

function bindActions() {
  app.querySelectorAll("[data-action]").forEach(element => element.addEventListener("click", event => {
    unlockAudio();
    const action = element.dataset.action;
    if (action === "settings") { screen = "settings"; renderSettings(); }
    if (action === "dismiss" && currentAlert) { dismissed.add(currentAlert.key); currentTest = null; renderMain(); }
    if (action === "toggle-timer") {
      const index = Number(element.dataset.timer);
      settings.utilityTimers[index] = toggleTimer(settings.utilityTimers[index]);
      saveSettings();
      renderedViewKey = "";
      renderMain();
    }
    if (action === "set-timer") {
      event.stopPropagation();
      openTimerEditor(Number(element.dataset.timer));
    }
  }));
}

function openTimerEditor(index) {
  const timer = settings.utilityTimers[index];
  const hours = Math.floor(timer.durationSeconds / 3600);
  const minutes = Math.floor((timer.durationSeconds % 3600) / 60);
  const seconds = timer.durationSeconds % 60;
  const modal = document.createElement("div");
  modal.className = "timer-modal";
  modal.innerHTML = `<section class="timer-dialog" role="dialog" aria-modal="true" aria-labelledby="timer-dialog-title">
    <div class="eyebrow">Startzeit</div>
    <h2 id="timer-dialog-title">Timer ${index + 1} einstellen</h2>
    <div class="time-inputs">
      <label><span>Std.</span><input type="number" min="0" max="99" value="${hours}" data-time="hours"></label>
      <span class="time-separator">:</span>
      <label><span>Min.</span><input type="number" min="0" max="59" value="${minutes}" data-time="minutes"></label>
      <span class="time-separator">:</span>
      <label><span>Sek.</span><input type="number" min="0" max="59" value="${seconds}" data-time="seconds"></label>
    </div>
    <div class="dialog-actions"><button class="button" data-dialog="cancel">Abbrechen</button><button class="button primary" data-dialog="apply">Übernehmen</button></div>
  </section>`;
  app.append(modal);
  modal.querySelector("[data-dialog='cancel']").addEventListener("click", () => modal.remove());
  modal.querySelector("[data-dialog='apply']").addEventListener("click", () => {
    const value = name => Math.max(0, Number(modal.querySelector(`[data-time='${name}']`).value) || 0);
    const total = value("hours") * 3600 + Math.min(59, value("minutes")) * 60 + Math.min(59, value("seconds"));
    settings.utilityTimers[index] = setTimerDuration(settings.utilityTimers[index], total);
    saveSettings();
    renderedViewKey = "";
    renderMain();
  });
}

function bindSettings(eventId) {
  app.querySelectorAll("[data-event]").forEach(button => button.addEventListener("click", () => {
    settings.selectedEventId = button.dataset.event;
    renderSettings();
  }));
  app.querySelector("[data-event-enabled]").addEventListener("change", event => { settings.events[eventId].enabled = event.target.checked; });
  app.querySelector("[data-show-artwork]").addEventListener("change", event => { settings.showArtwork = event.target.checked; });
  app.querySelectorAll("[data-alarm]").forEach(row => {
    const alarm = settings.events[eventId].alarms[Number(row.dataset.alarm)];
    row.querySelectorAll("[data-field]").forEach(input => input.addEventListener("change", event => {
      const field = event.target.dataset.field;
      alarm[field] = event.target.type === "checkbox" ? event.target.checked : field === "minutesBefore" ? Math.max(0, Math.min(1440, Number(event.target.value) || 0)) : event.target.value;
    }));
  });
  app.querySelector("[data-action='save']").addEventListener("click", () => { unlockAudio(); saveSettings(); screen = "main"; renderMain(); });
  app.querySelector("[data-action='cancel']").addEventListener("click", () => { settings = loadSettings(); screen = "main"; renderMain(); });
  app.querySelector("[data-action='test']").addEventListener("click", () => {
    unlockAudio();
    const alarm = settings.events[eventId].alarms[2];
    const schedule = SCHEDULES.find(item => item.id === eventId);
    currentTest = { schedule: { ...schedule, name: `${schedule.name} · Vorschau` }, target: new Date(Date.now() + 5 * 60_000), alarm, alarmIndex: 2, key: `test-${Date.now()}`, test: true };
    screen = "main";
    renderMain();
  });
}

function render() {
  if (screen === "settings") renderSettings(); else renderMain();
}

document.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("storage", event => {
  if (event.key !== storageKey) return;
  settings = loadSettings();
  render();
});

window.icueEvents = {
  onICUEInitialized: render,
  onDataUpdated: render
};

refreshOccurrences();
render();
setInterval(() => {
  if (screen === "main") renderMain(new Date());
  if (dismissed.size > 200) dismissed = new Set([...dismissed].slice(-100));
}, 1000);
