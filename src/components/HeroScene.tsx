import heroSign from '../assets/hero-sign.webp';

/**
 * Start-screen scene: the "bear crossing" sign by the night trail, and a bear in the dark behind it.
 * The picture is a flat illustration; on top of it the bear's eyes glow, blink and look around,
 * its breath clouds in the cold air, and a thin fog drifts along the trail.
 * Coordinates are in the picture's own pixels (1586 × 992).
 */
const EYES = [
  { x: 856, y: 482 },
  { x: 902, y: 482 },
];

export default function HeroScene() {
  return (
    <svg
      className="hero-art hero-scene"
      viewBox="0 0 1586 992"
      preserveAspectRatio="xMaxYMid slice"
      role="img"
      aria-label="夜の山道の脇に「クマ出没注意」の黄色い標識。その奥の暗い森で、クマの目が光ってこちらを見ている"
    >
      <defs>
        <filter id="hsGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="hsBreath" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="hsFog" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <radialGradient id="hsHalo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb238" stopOpacity=".55" />
          <stop offset="1" stopColor="#ff8a1e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <image href={heroSign} x="0" y="0" width="1586" height="992" preserveAspectRatio="none" />

      {/* fog drifting low along the trail */}
      <g className="hs-fog" filter="url(#hsFog)" opacity=".5">
        <ellipse cx="820" cy="860" rx="420" ry="40" fill="#3d5288" />
        <ellipse cx="1180" cy="930" rx="380" ry="34" fill="#34477a" />
      </g>

      {/* the bear's breath, rising from just below the eyes */}
      <g className="hs-breath-wrap">
        <ellipse className="hs-breath b1" cx="872" cy="522" rx="22" ry="11" fill="#b4c6ee" filter="url(#hsBreath)" />
        <ellipse className="hs-breath b2" cx="872" cy="522" rx="15" ry="8" fill="#b9c9ef" filter="url(#hsBreath)" />
      </g>

      {/* glowing eyes: a soft halo that breathes, bright cores that blink and glance.
          Animated with SVG's own <animate> (sizes change in place), so the eyes never stretch
          when the picture is cropped differently on each screen. */}
      <ellipse cx="879" cy="482" rx="46" ry="22" fill="url(#hsHalo)">
        <animate attributeName="opacity" values=".25;.55;.25" dur="3.6s" repeatCount="indefinite" />
      </ellipse>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 0;-5 0;-5 0;0 0;0 0" keyTimes="0;.3;.38;.55;.63;1" dur="9s" repeatCount="indefinite" />
        {EYES.map((e) => (
          <g key={e.x}>
            <ellipse cx={e.x} cy={e.y} rx="7" ry="5.8" fill="#ff9d2e" filter="url(#hsGlow)" opacity=".7">
              <animate attributeName="ry" values="5.8;5.8;.8;.8;5.8;5.8" keyTimes="0;.88;.9;.92;.94;1" dur="5.2s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx={e.x} cy={e.y} rx="5.4" ry="4.6" fill="#ffc35a">
              <animate attributeName="ry" values="4.6;4.6;.5;.5;4.6;4.6" keyTimes="0;.88;.9;.92;.94;1" dur="5.2s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx={e.x - 1.2} cy={e.y - 1} rx="1.8" ry="1.4" fill="#fff4d2">
              <animate attributeName="opacity" values="1;1;0;0;1;1" keyTimes="0;.88;.9;.92;.94;1" dur="5.2s" repeatCount="indefinite" />
            </ellipse>
          </g>
        ))}
      </g>
    </svg>
  );
}
