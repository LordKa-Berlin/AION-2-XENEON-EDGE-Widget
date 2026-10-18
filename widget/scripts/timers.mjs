const MAX_TIMER_SECONDS = 99 * 3600 + 59 * 60 + 59;

export function clampTimerSeconds(value) {
  return Math.max(1, Math.min(MAX_TIMER_SECONDS, Math.round(Number(value) || 0)));
}

export function normalizeTimer(source, fallback) {
  const durationSeconds = clampTimerSeconds(source?.durationSeconds ?? fallback.durationSeconds);
  const storedRemaining = Number(source?.remainingSeconds);
  const remainingSeconds = Number.isFinite(storedRemaining)
    ? Math.max(0, Math.min(durationSeconds, storedRemaining))
    : durationSeconds;
  const endsAt = Number(source?.endsAt);
  return {
    durationSeconds,
    remainingSeconds,
    running: Boolean(source?.running && Number.isFinite(endsAt)),
    endsAt: Number.isFinite(endsAt) ? endsAt : null
  };
}

export function timerRemaining(timer, now = Date.now()) {
  if (!timer.running || !timer.endsAt) return Math.max(0, timer.remainingSeconds);
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function toggleTimer(timer, now = Date.now()) {
  const remaining = timerRemaining(timer, now);
  if (timer.running) return { ...timer, running: false, remainingSeconds: remaining, endsAt: null };
  const startSeconds = remaining > 0 ? remaining : timer.durationSeconds;
  return { ...timer, running: true, remainingSeconds: startSeconds, endsAt: now + startSeconds * 1000 };
}

export function setTimerDuration(timer, durationSeconds) {
  const seconds = clampTimerSeconds(durationSeconds);
  return { ...timer, durationSeconds: seconds, remainingSeconds: seconds, running: false, endsAt: null };
}

export function settleTimer(timer, now = Date.now()) {
  if (!timer.running || timerRemaining(timer, now) > 0) return timer;
  return { ...timer, running: false, remainingSeconds: 0, endsAt: null };
}

export function formatTimer(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
