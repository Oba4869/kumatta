import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { canLockLandscape, enterLandscape, portraitQuery } from '../lib/landscape';

const KEY = 'kumatta.portraitOk';

/**
 * The whole app is laid out for a phone held sideways. While a touch screen is upright, this covers the
 * menus with a "turn your phone" notice. Where the browser can lock the orientation (Android Chrome) it
 * offers a button that does it; elsewhere (iPhone) it asks to turn the phone, and lets the player carry
 * on upright if their rotation lock is on. The play screen has its own notice, which also pauses the game.
 */
export default function RotateNotice() {
  const { pathname } = useLocation();
  const [upright, setUpright] = useState(() => portraitQuery().matches);
  const [ok, setOk] = useState(() => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const q = portraitQuery();
    const on = () => setUpright(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);

  if (!upright || ok || pathname === '/play') return null;

  const stayUpright = () => {
    setOk(true);
    try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode: just for this visit */ }
  };

  return (
    <div className="rotate-notice" role="dialog" aria-modal="true" aria-labelledby="rotateTitle">
      <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="22" y="8" width="20" height="36" rx="4" /><path d="M14 50c6 6 30 6 36 0M44 46l6 4-6 4" /></svg>
      <p id="rotateTitle">スマホを<b>横向き</b>にして<br />遊んでください</p>
      {canLockLandscape() ? (
        <button className="mbtn primary" type="button" onClick={() => enterLandscape()}>横画面にする</button>
      ) : (
        <small>画面の向きのロックがオンのときは、オフにしてから横にしてください</small>
      )}
      <button className="rotate-skip" type="button" onClick={stayUpright}>このまま縦で見る</button>
    </div>
  );
}
