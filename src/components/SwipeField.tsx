/** Markup driven by SwipePad (game/swipe.ts): the pull area with its slingshot band and gauge, and the reveal layers above everything. */

export function SwipeField() {
  return (
    <div className="swipe" id="swipe" tabIndex={0} aria-label="画面を引っぱって動く。下へゆっくりで後退、横へゆっくりでそっと立ち去る" hidden>
      <svg className="sling" id="sling" aria-hidden="true">
        <line className="bandglow" id="bandglow" />
        <line className="band" id="band" />
        <circle className="anchor" id="anchor" r="9" />
        <g id="grip">
          <g className="chev">
            <path d="M-12 44 l12 10 l12 -10" />
            <path d="M-12 58 l12 10 l12 -10" />
            <path d="M-12 72 l12 10 l12 -10" />
          </g>
          <circle className="gtrack" r="34" />
          <circle className="gmeter" id="gaugemeter" r="34" />
          <circle className="gcore" r="12" />
        </g>
      </svg>
      <p className="swipehint" id="swipehint">引っぱって動く　下＝後退／横＝立ち去る</p>
    </div>
  );
}

const BEARMARK = (
  <svg className="orbmark" width="70" height="70" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="5.6" cy="6.4" r="3.4" fill="currentColor" />
    <circle cx="18.4" cy="6.4" r="3.4" fill="currentColor" />
    <path fill="currentColor" fillRule="evenodd" d="M3.5 13.5a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0Z M7.8 11.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0Z M13.6 11.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0Z M8.7 16.2a3.3 2.5 0 1 0 6.6 0a3.3 2.5 0 1 0 -6.6 0Z" />
    <circle cx="12" cy="15.5" r="1.15" fill="currentColor" />
  </svg>
);

export function RevealLayers() {
  return (
    <>
      <div className="callout" id="callout" aria-live="assertive" hidden />
      <div className="flash" id="flash" />
      <div className="orbwrap" id="orbwrap" data-tier="hidden" hidden>
        <div className="orbstage">
          <div className="rays" aria-hidden="true" />
          <div className="orbring" id="orbring" />
          <div className="orb" id="orb">
            <span className="gloss" aria-hidden="true" />
            {BEARMARK}
          </div>
          <div className="sparks" id="sparks" aria-hidden="true" />
        </div>
        <p className="tierlab" id="tierlab" />
        <p className="tiersub" id="tiersub" />
      </div>
    </>
  );
}
