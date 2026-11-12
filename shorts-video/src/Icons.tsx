import { useCurrentFrame } from "remotion";

// 장면 내용과 연관된 그림들. 선은 검정, 면은 노랑·하늘색 (색 강조는 숫자에만)
const INK = "#111111";
const BRAND = "#FFD84D";
const BRAND_LIGHT = "#FFF1A8";
const SKY = "#EAF7FF";
const WATER = "#BFE6FF";
const SW = 7;

const WaterDrop: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M 0 -22 C 0 -22 -16 2 -16 12 C -16 22 -9 28 0 28 C 9 28 16 22 16 12 C 16 2 0 -22 0 -22 Z"
    fill={WATER}
    stroke={INK}
    strokeWidth={SW / s}
    strokeLinejoin="round"
  />
);

/** 눈송이 (낮은 기온) */
export const Snowflake: React.FC = () => (
  <svg width="190" height="190" viewBox="0 0 190 190">
    <circle cx="95" cy="95" r="86" fill={SKY} stroke={INK} strokeWidth={SW} />
    {[0, 60, 120].map((a) => (
      <g key={a} transform={`rotate(${a} 95 95)`}>
        <line x1="95" y1="28" x2="95" y2="162" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <polyline points="78,44 95,58 112,44" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="78,146 95,132 112,146" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ))}
  </svg>
);

/** 난방기 (실내 난방) */
export const Heater: React.FC = () => (
  <svg width="190" height="190" viewBox="0 0 190 190">
    <rect x="22" y="70" width="146" height="100" rx="20" fill={BRAND} stroke={INK} strokeWidth={SW} />
    {[58, 82, 106, 130].map((x) => (
      <line key={x} x1={x} y1="90" x2={x} y2="150" stroke={INK} strokeWidth="9" strokeLinecap="round" />
    ))}
    {[50, 95, 140].map((x) => (
      <path
        key={x}
        d={`M ${x} 56 q -10 -10 0 -20 q 10 -10 0 -20`}
        fill="none"
        stroke={INK}
        strokeWidth="8"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

/** 갈라진 건조한 피부 (결과) */
export const DryPatch: React.FC = () => (
  <svg width="190" height="190" viewBox="0 0 190 190">
    <rect x="12" y="12" width="166" height="166" rx="34" fill={BRAND_LIGHT} stroke={INK} strokeWidth={SW} />
    <polyline points="40,40 70,80 52,104 90,132 74,168" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="150,38 124,76 146,104 112,126 132,164" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="90,28 100,56 86,76" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 수도꼭지 + 물방울 (미지근한 물 세안) */
export const Faucet: React.FC = () => (
  <svg width="240" height="240" viewBox="0 0 240 240">
    <rect x="96" y="14" width="46" height="26" rx="10" fill={BRAND} stroke={INK} strokeWidth={SW} />
    <line x1="119" y1="40" x2="119" y2="62" stroke={INK} strokeWidth={SW} />
    <path
      d="M 16 74 H 150 Q 190 74 190 110 V 128 H 140 V 112 Q 140 112 130 112 H 16 Z"
      fill="#FFFFFF"
      stroke={INK}
      strokeWidth={SW}
      strokeLinejoin="round"
    />
    <rect x="136" y="124" width="58" height="22" rx="8" fill={BRAND} stroke={INK} strokeWidth={SW} />
    <WaterDrop x={165} y={176} s={0.8} />
    <WaterDrop x={165} y={222} s={0.62} />
  </svg>
);

/** 보습제 병 (촉촉할 때 보습) */
export const CreamJar: React.FC = () => (
  <svg width="240" height="240" viewBox="0 0 240 240">
    <rect x="40" y="50" width="160" height="42" rx="14" fill={BRAND} stroke={INK} strokeWidth={SW} />
    <rect x="30" y="86" width="180" height="128" rx="30" fill="#FFFFFF" stroke={INK} strokeWidth={SW} />
    <path d="M 33 150 H 207 V 184 Q 207 211 180 211 H 60 Q 33 211 33 184 Z" fill={WATER} />
    <WaterDrop x={120} y={150} s={1.15} />
    <ellipse cx="62" cy="122" rx="9" ry="20" fill="#fff" opacity="0.9" transform="rotate(14 62 122)" />
    <WaterDrop x={196} y={30} s={0.55} />
    <WaterDrop x={34} y={22} s={0.45} />
  </svg>
);

/** 가습기 + 수증기 (실내 습도) */
export const Humidifier: React.FC = () => (
  <svg width="240" height="240" viewBox="0 0 240 240">
    {[84, 120, 156].map((x, i) => (
      <path
        key={x}
        d={`M ${x} ${70 - (i % 2) * 8} q -14 -14 0 -28 q 14 -14 0 -28`}
        fill="none"
        stroke={INK}
        strokeWidth="8"
        strokeLinecap="round"
      />
    ))}
    <rect x="44" y="84" width="152" height="124" rx="32" fill={SKY} stroke={INK} strokeWidth={SW} />
    <rect x="80" y="74" width="80" height="22" rx="10" fill={BRAND} stroke={INK} strokeWidth={SW} />
    <path d="M 47 156 H 193 V 178 Q 193 205 166 205 H 74 Q 47 205 47 178 Z" fill={WATER} />
    <WaterDrop x={120} y={140} s={1.05} />
    <circle cx="176" cy="196" r="6" fill={INK} />
  </svg>
);

/** 잔주름 */
export const WrinkleIcon: React.FC = () => (
  <svg width="130" height="130" viewBox="0 0 130 130">
    <rect x="8" y="8" width="114" height="114" rx="30" fill={BRAND_LIGHT} stroke={INK} strokeWidth={SW} />
    {[44, 66, 88].map((y) => (
      <path key={y} d={`M 28 ${y} q 12 -12 24 0 t 24 0 t 24 0`} fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
    ))}
  </svg>
);

/** 화장 들뜸 (들뜨는 조각) */
export const FlakeIcon: React.FC = () => (
  <svg width="130" height="130" viewBox="0 0 130 130">
    <rect x="8" y="8" width="114" height="114" rx="30" fill={BRAND_LIGHT} stroke={INK} strokeWidth={SW} />
    <line x1="22" y1="96" x2="108" y2="96" stroke={INK} strokeWidth="7" strokeLinecap="round" />
    <path d="M 30 96 q 4 -24 24 -28 q 6 18 -6 28 Z" fill="#fff" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <path d="M 62 96 q 6 -30 30 -34 q 8 22 -8 34 Z" fill="#fff" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    <circle cx="96" cy="44" r="5" fill={INK} />
    <circle cx="40" cy="48" r="5" fill={INK} />
  </svg>
);

/** 피부 당김 (양쪽으로 당겨짐) */
export const TightIcon: React.FC = () => (
  <svg width="130" height="130" viewBox="0 0 130 130">
    <rect x="8" y="8" width="114" height="114" rx="30" fill={BRAND_LIGHT} stroke={INK} strokeWidth={SW} />
    <line x1="30" y1="65" x2="100" y2="65" stroke={INK} strokeWidth="8" strokeLinecap="round" />
    <polyline points="46,48 28,65 46,82" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="84,48 102,65 84,82" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 패치 테스트 (피부 반응 확인) */
export const PatchTest: React.FC = () => (
  <svg width="240" height="240" viewBox="0 0 240 240">
    <rect x="20" y="40" width="200" height="160" rx="40" fill={BRAND_LIGHT} stroke={INK} strokeWidth={SW} />
    <circle cx="96" cy="118" r="38" fill="#FFFFFF" stroke={INK} strokeWidth={SW} />
    <circle cx="96" cy="118" r="14" fill={BRAND} stroke={INK} strokeWidth="5" />
    <circle cx="170" cy="168" r="36" fill="#FFFFFF" stroke={INK} strokeWidth={SW} />
    <polyline points="152,168 166,182 190,154" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="176" cy="84" r="9" fill="#FF8A80" stroke={INK} strokeWidth="4" />
  </svg>
);

/** 눈 내리는 배경 (deco: "snow") */
const FLAKES = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 173 + 60) % 1040,
  y0: (i * 311) % 1900,
  r: 8 + ((i * 7) % 5) * 5,
  v: 2.2 + ((i * 3) % 5) * 0.7,
}));

export const Snow: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <svg
      width="1080"
      height="1920"
      viewBox="0 0 1080 1920"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {FLAKES.map((k, i) => (
        <circle
          key={i}
          cx={k.x + 24 * Math.sin((f + i * 20) * 0.05)}
          cy={(k.y0 + f * k.v) % 1900}
          r={k.r}
          fill="#D6ECFF"
        />
      ))}
    </svg>
  );
};
