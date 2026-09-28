/**
 * Procedural stage-by-stage illustration used when no photography is available.
 * It is an honest placeholder (a diagram, not a fake photo): each stage adds one layer of the transformation.
 * Colors come only from design tokens via the .art-* classes.
 */
export function StageArt({ stage }: { stage: number }) {
  const s = Math.max(0, Math.min(5, stage));
  const trees = [[300, 560, 120], [520, 540, 90], [1180, 545, 130], [1400, 565, 100], [860, 530, 70]];
  return (
    <svg className="stage-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Stage ${s + 1} of the transformation`}>
      <defs>
        <filter id={`glow-${s}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>
      <rect width="1600" height="900" className={s >= 4 ? "art-sky-night" : "art-sky"} />
      {s >= 5 && <circle cx="1240" cy="170" r="52" className="art-moon" />}
      <path d="M0 520 C 260 470, 520 500, 800 480 S 1340 450, 1600 490 L1600 900 L0 900Z" className="art-far" />
      <rect y="560" width="1600" height="340" className="art-ground" />
      <line x1="0" y1="560" x2="1600" y2="560" className="art-line" />

      {/* 0 — bare site: a few tufts and one existing tree */}
      {[140, 420, 700, 980, 1290, 1500].map((x, i) => <path key={x} d={`M${x} ${760 + (i % 3) * 30} l6 -22 l6 22 M${x + 14} ${760 + (i % 3) * 30} l5 -16 l5 16`} className="art-line" fill="none" />)}
      <g className="art-line" fill="none"><path d="M800 560 V470" /><circle cx="800" cy="440" r="46" /></g>

      {/* 1 — design: survey grid, dimension line, planned tree rings */}
      {s >= 1 && (
        <g className="art-plan" fill="none">
          {[610, 670, 750, 850].map((y) => <line key={y} x1="0" x2="1600" y1={y} y2={y} />)}
          {[-600, -300, 0, 300, 600, 900].map((dx) => <line key={dx} x1={800 + dx} y1="560" x2={800 + dx * 2.6} y2="900" />)}
          {trees.map(([x, y, r]) => <circle key={x} cx={x} cy={y - r * 0.6} r={r * 0.7} strokeDasharray="8 10" />)}
          <path d="M240 850 H1360 M240 838 V862 M1360 838 V862" />
        </g>
      )}

      {/* 2 — construction: terrace, steps, pool, retaining wall */}
      {s >= 2 && (
        <g>
          <polygon points="360,700 1240,700 1340,820 260,820" className="art-paving" />
          <polygon points="560,720 1040,720 1090,790 510,790" className={s >= 5 ? "art-pool art-pool-lit" : "art-pool"} />
          <rect x="120" y="600" width="260" height="46" className="art-paving" />
          <rect x="1220" y="600" width="260" height="46" className="art-paving" />
          {[0, 1, 2].map((i) => <line key={i} x1={300 + i * 30} y1={826 + i * 8} x2={1300 - i * 30} y2={826 + i * 8} className="art-line" />)}
        </g>
      )}

      {/* 3 — planting: canopies, trunks, shrub line */}
      {s >= 3 && (
        <g>
          {trees.map(([x, y, r]) => (
            <g key={x}>
              <line x1={x} y1={y} x2={x} y2={y - r * 0.9} className="art-trunk" />
              <circle cx={x} cy={y - r * 0.95} r={r * 0.7} className="art-canopy" />
              <circle cx={x - r * 0.35} cy={y - r * 0.7} r={r * 0.45} className="art-canopy art-canopy-2" />
            </g>
          ))}
          {[180, 260, 1340, 1420, 610, 990].map((x) => <ellipse key={x} cx={x} cy="700" rx="46" ry="26" className="art-canopy art-canopy-2" />)}
        </g>
      )}

      {/* 4 & 5 — lighting: soft accent glows under trees and along the terrace */}
      {s >= 4 && (
        <g filter={`url(#glow-${s})`} className={s >= 5 ? "art-glow art-glow-full" : "art-glow"}>
          {trees.map(([x, y]) => <ellipse key={x} cx={x} cy={y + 8} rx="90" ry="26" />)}
          <ellipse cx="800" cy="770" rx="330" ry="34" />
        </g>
      )}
    </svg>
  );
}
