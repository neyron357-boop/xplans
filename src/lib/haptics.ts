/** A short tick under the finger, where the phone can do it (Android). */
export function tap(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported; the screen answers anyway.
  }
}
