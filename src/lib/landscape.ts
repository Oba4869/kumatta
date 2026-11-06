/**
 * The 3D game is laid out for a phone held sideways.
 * On a touch screen we ask the browser to go full screen and lock to landscape when a run starts.
 * Android Chrome allows this; iPhone Safari does not, so there the play screen shows a
 * "turn your phone" notice (and the game waits) until the phone is turned.
 */
const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

/** Call from a tap (browsers allow full screen only in response to one). Never throws. */
export async function enterLandscape() {
  if (!touch()) return;
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape');
  } catch {
    /* not allowed here (iPhone, desktop, an embedded view): the notice on the play screen takes over */
  }
}

/** Whether this browser can go full screen and lock to landscape (Android Chrome yes, iPhone Safari no). */
export function canLockLandscape() {
  return touch() && !!document.documentElement.requestFullscreen && typeof (screen.orientation as LockableOrientation | undefined)?.lock === 'function';
}

/** Undo enterLandscape. Not used while the whole app is landscape; kept for a screen that wants upright. */
export function leaveLandscape() {
  try { screen.orientation?.unlock?.(); } catch { /* nothing to undo */ }
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

/** True while a touch screen is held upright: the game pauses and asks to be turned. */
export const portraitQuery = () => matchMedia('(pointer:coarse) and (orientation:portrait)');
