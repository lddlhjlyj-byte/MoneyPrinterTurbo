import { Audio } from "@remotion/media";
import cardsData from "./cards.json";
import { CharacterSynthetic, CharacterTalking, Gesture } from "./Character";
import {
  CreamJar,
  DryPatch,
  Faucet,
  FlakeIcon,
  Heater,
  Humidifier,
  PatchTest,
  Snow,
  Snowflake,
  TightIcon,
  WrinkleIcon,
} from "./Icons";
import {
  HANDS_REST_Y,
  IN,
  OUT,
  Pose,
  arc,
  hookPose,
  itemPose,
  lerp,
  MOVES,
  MoveName,
  outroPose,
  summaryPose,
  titlePose,
  whyPose,
} from "./choreo";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FONT =
  '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const INK = "#111111";
const SUB = "#666666";
const ACCENT = "#E5322D"; // 색 강조는 숫자에만
const BRAND = "#FFD84D"; // 캐릭터 노랑
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

type Common = { move?: MoveName; gesture?: Gesture; deco?: "snow" };

type Scene = (
  | {
      type: "hook";
      seconds: number;
      line1: string;
      line2: string;
      warn: string;
      audio?: string;
    }
  | {
      type: "why";
      seconds: number;
      head: string;
      sub: string;
      kind?: "capsule" | "bottle" | "sun" | "winter";
      a: string;
      b: string;
      c: string;
      audio?: string;
    }
  | {
      type: "title";
      seconds: number;
      text: string;
      num: string;
      audio?: string;
    }
  | {
      type: "item";
      seconds: number;
      n: number;
      worry?: boolean;
      icon?: "faucet" | "cream" | "bottle" | "humidifier" | "patch" | "heater";
      head: string;
      sub: string;
      tags: string[];
      audio?: string;
    }
  | {
      type: "signs";
      seconds: number;
      head: string;
      sub: string;
      rows: string[];
      icons: ("wrinkle" | "flake" | "tight")[];
      audio?: string;
    }
  | {
      type: "summary";
      seconds: number;
      title: string;
      rows: string[];
      audio?: string;
    }
  | {
      type: "outro";
      seconds: number;
      text: string;
      sub: string;
      note?: string;
      audio?: string;
    }
) &
  Common;

export type InfoCardProps = { scenes: Scene[] };
export const FPS = 30;

export const calculateInfoCardMetadata: CalculateMetadataFunction<
  InfoCardProps
> = ({ props }) => ({
  durationInFrames: Math.max(
    1,
    props.scenes.reduce((s, sc) => s + Math.round(sc.seconds * FPS), 0),
  ),
});

// 등장: 투명→불투명 + 아래에서 위로
const enter = (frame: number, delay: number, dur = 18) => {
  const t = interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return { opacity: t, translate: `0px ${(1 - t) * 60}px` };
};

const Fade: React.FC<{ total: number; children: React.ReactNode }> = ({
  total,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 5, total - 6, total], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const Center: React.FC<{ children: React.ReactNode; gap?: number }> = ({
  children,
  gap = 36,
}) => (
  <AbsoluteFill
    style={{
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      padding: "0 70px 760px",
      gap,
      flexDirection: "column",
    }}
  >
    {children}
  </AbsoluteFill>
);

// 쿵 떨어져 튕기는 등장 (위에서 내리꽂힘)
const slam = (f: number, t0: number) =>
  lerp(f, [t0, t0 + 9], [-1000, 0], IN) + arc(f, t0 + 9, 9, 36);

/* ───────── 후킹: 점프해서 위의 자막을 잡아 끌어내림 ───────── */
const Hook: React.FC<{ s: Extract<Scene, { type: "hook" }> }> = ({ s }) => {
  const frame = useCurrentFrame();
  const p = hookPose(frame);
  const grabbed = frame >= 54;
  // 손이 잡은 높이를 따라 내려오다가 캐릭터 머리 위(1100)에서 멈춘다
  const bannerTop = grabbed
    ? Math.min(1100, HANDS_REST_Y - 354 + p.y)
    : 426;
  const bannerOpacity = lerp(frame, [24, 34], [0, 1]);
  const bannerScale = lerp(frame, [54, 58], [1.1, 1]);
  const pulse = 1 + 0.03 * Math.sin((frame / FPS) * Math.PI * 3);
  return (
    <AbsoluteFill style={{ textAlign: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          fontSize: 150,
          fontWeight: 900,
          color: INK,
          translate: `0px ${slam(frame, 6)}px`,
          scale: pulse,
        }}
      >
        {s.line1}
      </div>
      <div
        style={{
          ...enter(frame, 18),
          position: "absolute",
          top: 280,
          left: 0,
          right: 0,
          fontSize: 100,
          fontWeight: 900,
          color: INK,
        }}
      >
        {s.line2}
      </div>
      <div
        style={{
          position: "absolute",
          top: bannerTop,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: bannerOpacity,
        }}
      >
        <div
          style={{
            background: INK,
            color: "#fff",
            fontSize: 56,
            fontWeight: 800,
            padding: "22px 48px",
            borderRadius: 24,
            scale: bannerScale,
            display: s.warn ? undefined : "none",
          }}
        >
          {s.warn}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── 원리 설명: Q10 캡슐 + 지방 → 흡수 ───────── */
const Capsule: React.FC = () => (
  <svg width="230" height="120" viewBox="0 0 230 120" style={{ rotate: "-18deg" }}>
    <rect x="5" y="5" width="220" height="110" rx="55" fill="#fff" stroke={INK} strokeWidth="7" />
    <path d="M 60 5 H 115 V 115 H 60 A 55 55 0 0 1 60 5 Z" fill={BRAND} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
    <ellipse cx="62" cy="34" rx="22" ry="8" fill="#fff" opacity="0.6" />
  </svg>
);

const Bottle: React.FC = () => (
  <svg width="150" height="200" viewBox="0 0 150 200">
    <rect x="55" y="8" width="40" height="46" rx="18" fill={BRAND} stroke={INK} strokeWidth="7" />
    <rect x="42" y="50" width="66" height="24" rx="7" fill="#fff" stroke={INK} strokeWidth="7" />
    <rect x="28" y="70" width="94" height="122" rx="24" fill="#EAF7FF" stroke={INK} strokeWidth="7" />
    <path d="M 31 124 H 119 V 168 Q 119 189 98 189 H 52 Q 31 189 31 168 Z" fill="#BFE6FF" />
    <ellipse cx="50" cy="110" rx="8" ry="22" fill="#fff" opacity="0.8" />
  </svg>
);

const Sun: React.FC<{ t: string }> = ({ t }) => (
  <svg width="170" height="170" viewBox="0 0 170 170">
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line
        key={a}
        x1="85"
        y1="14"
        x2="85"
        y2="30"
        stroke={INK}
        strokeWidth="9"
        strokeLinecap="round"
        transform={`rotate(${a} 85 85)`}
      />
    ))}
    <circle cx="85" cy="85" r="48" fill={BRAND} stroke={INK} strokeWidth="7" />
    <text x="85" y="97" textAnchor="middle" fontSize="34" fontWeight="900" fill={INK} fontFamily={FONT}>
      {t}
    </text>
  </svg>
);

const Drop: React.FC<{ size?: number }> = ({ size = 1 }) => (
  <svg width={130 * size} height={160 * size} viewBox="0 0 130 160">
    <path
      d="M 65 8 C 65 8 14 74 14 106 C 14 136 36 152 65 152 C 94 152 116 136 116 106 C 116 74 65 8 65 8 Z"
      fill="#FFE9A0"
      stroke={INK}
      strokeWidth="7"
      strokeLinejoin="round"
    />
    <ellipse cx="44" cy="100" rx="10" ry="20" fill="#fff" opacity="0.7" transform="rotate(18 44 100)" />
  </svg>
);

const Absorb: React.FC = () => (
  <svg width="190" height="190" viewBox="0 0 190 190">
    <circle cx="95" cy="95" r="84" fill="#fff" stroke={INK} strokeWidth="9" />
    <polyline points="52,98 84,130 140,64" fill="none" stroke={INK} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Why: React.FC<{ s: Extract<Scene, { type: "why" }> }> = ({ s }) => {
  const frame = useCurrentFrame();
  const label = (t: string, delay: number) => (
    <div
      style={{
        ...enter(frame, delay),
        fontSize: 44,
        fontWeight: 800,
        color: INK,
        marginTop: 14,
      }}
    >
      {t}
    </div>
  );
  const op = (t: string, delay: number) => (
    <div
      style={{
        ...enter(frame, delay),
        fontSize: 110,
        fontWeight: 900,
        color: INK,
        lineHeight: 1,
        paddingBottom: 60,
      }}
    >
      {t}
    </div>
  );
  return (
    <AbsoluteFill style={{ textAlign: "center", padding: "0 60px" }}>
      <div
        style={{
          ...enter(frame, 0),
          position: "absolute",
          top: 150,
          left: 0,
          right: 0,
          fontSize: 92,
          fontWeight: 900,
          color: INK,
        }}
      >
        {s.head}
      </div>
      <div
        style={{
          ...enter(frame, 10),
          position: "absolute",
          top: 290,
          left: 0,
          right: 0,
          fontSize: 54,
          fontWeight: 600,
          color: SUB,
        }}
      >
        {s.sub}
      </div>
      <div
        style={{
          position: "absolute",
          top: 560,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 26,
          scale: 1.25,
        }}
      >
        <div style={{ ...enter(frame, 22), display: "flex", flexDirection: "column", alignItems: "center" }}>
          {s.kind === "winter" ? <Snowflake /> : s.kind === "sun" ? <Sun t="UVB" /> : s.kind === "bottle" ? <Bottle /> : <Capsule />}
          {label(s.a, 24)}
        </div>
        {op("+", 40)}
        <div style={{ ...enter(frame, 46), display: "flex", flexDirection: "column", alignItems: "center" }}>
          {s.kind === "winter" ? <Heater /> : s.kind === "sun" ? <Sun t="UVA" /> : <Drop />}
          {label(s.b, 48)}
        </div>
        {op("→", 64)}
        <div style={{ ...enter(frame, 70), display: "flex", flexDirection: "column", alignItems: "center" }}>
          {s.kind === "winter" ? <DryPatch /> : <Absorb />}
          {label(s.c, 72)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ───────── 타이틀: 숫자가 쿵 내리꽂힘 ───────── */
const Title: React.FC<{ s: Extract<Scene, { type: "title" }> }> = ({ s }) => {
  const frame = useCurrentFrame();
  const hit = frame - 12;
  const shake = hit > 0 ? 16 * Math.exp(-hit / 6) * Math.sin(hit * 2.4) : 0;
  return (
    <Center gap={10}>
      <div style={{ translate: `0px ${shake}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div
          style={{
            ...enter(frame, 0),
            fontSize: 110,
            fontWeight: 900,
            color: INK,
          }}
        >
          {s.text}
        </div>
        <div
          style={{
            fontSize: 300,
            fontWeight: 900,
            color: ACCENT,
            lineHeight: 1.1,
            opacity: frame >= 4 ? 1 : 0,
            translate: `0px ${lerp(frame, [4, 12], [-1100, 0], IN) + arc(frame, 12, 10, 40)}px`,
          }}
        >
          {s.num}
        </div>
      </div>
    </Center>
  );
};

const Progress: React.FC<{ n: number; total?: number }> = ({ n, total = 4 }) => (
  <div
    style={{
      position: "absolute",
      top: 64,
      left: 70,
      right: 70,
      display: "flex",
      gap: 16,
    }}
  >
    {Array.from({ length: total }, (_, k) => k + 1).map((i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: 14,
          borderRadius: 7,
          background: i <= n ? INK : "#DDDDDD",
        }}
      />
    ))}
  </div>
);

const ITEM_ICONS = {
  faucet: <Faucet />,
  cream: <CreamJar />,
  bottle: <Bottle />,
  humidifier: <Humidifier />,
  patch: <PatchTest />,
  heater: <Heater />,
};

/* ───────── 항목: n마다 다른 등장 (달려옴 / 솟아오름 / 회전 / 쿵) ───────── */
const Item: React.FC<{ s: Extract<Scene, { type: "item" }>; dur: number }> = ({
  s,
  dur,
}) => {
  const frame = useCurrentFrame();
  const ring = interpolate(frame, [0, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const R = 190;
  const C = 2 * Math.PI * R;

  let tx = 0;
  let ty = 0;
  if (s.n === 1) tx = lerp(frame, [4, 30], [-1100, 0], OUT); // 캐릭터가 밀고 들어옴
  if (s.n === 3) tx = lerp(frame, [0, 22], [1100, 0], OUT); // 오른쪽에서 휙
  if (s.n === 4) {
    ty = slam(frame, 0);
    const h = frame - 10;
    tx = h > 0 ? 14 * Math.exp(-h / 6) * Math.sin(h * 2.2) : 0;
  }
  void dur;

  return (
    <>
      <Progress n={s.n} total={Math.max(...((cardsData.scenes as { type: string; n?: number }[]).filter((x) => x.type === "item") as { n: number }[]).map((x) => x.n))} />
      <Center gap={50}>
        <div
          style={{
            translate: `${tx}px ${ty}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 50,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 400,
              height: 400,
              ...enter(frame, 0, 14),
            }}
          >
            <svg
              width="400"
              height="400"
              viewBox="0 0 460 460"
              style={{ position: "absolute", inset: 0, rotate: "-90deg" }}
            >
              <circle
                cx="230"
                cy="230"
                r={R}
                fill="none"
                stroke="#EEEEEE"
                strokeWidth="26"
              />
              <circle
                cx="230"
                cy="230"
                r={R}
                fill="none"
                stroke={ACCENT}
                strokeWidth="26"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - ring)}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 240,
                fontWeight: 900,
                color: ACCENT,
              }}
            >
              {s.icon ? ITEM_ICONS[s.icon] : s.n}
            </div>
            {s.icon ? (
              <div
                style={{
                  position: "absolute",
                  left: -14,
                  top: -14,
                  width: 112,
                  height: 112,
                  borderRadius: 56,
                  background: "#FFFFFF",
                  border: `7px solid ${INK}`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 72,
                  fontWeight: 900,
                  color: ACCENT,
                }}
              >
                {s.n}
              </div>
            ) : null}
          </div>
          <div
            style={{
              ...enter(frame, 14),
              fontSize: s.head.length > 14 ? 72 : s.head.length > 10 ? 84 : s.head.length > 7 ? 104 : 124,
              fontWeight: 900,
              color: INK,
            }}
          >
            {s.head}
          </div>
          <div
            style={{
              ...enter(frame, 24),
              fontSize: 58,
              fontWeight: 500,
              color: SUB,
            }}
          >
            {s.sub}
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 10 }}>
            {s.tags.map((tag, i) => (
              <div
                key={tag}
                style={{
                  ...enter(frame, 34 + i * 7),
                  fontSize: 50,
                  fontWeight: 700,
                  color: INK,
                  border: `5px solid ${INK}`,
                  borderRadius: 60,
                  padding: "14px 34px",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </Center>
    </>
  );
};

const SIGN_ICONS = {
  wrinkle: <WrinkleIcon />,
  flake: <FlakeIcon />,
  tight: <TightIcon />,
};

/* ───────── 건조 신호: 아이콘 + 문구 세 줄 ───────── */
const Signs: React.FC<{ s: Extract<Scene, { type: "signs" }> }> = ({ s }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ textAlign: "center", padding: "0 60px" }}>
      <div
        style={{
          ...enter(frame, 0),
          position: "absolute",
          top: 150,
          left: 0,
          right: 0,
          fontSize: 92,
          fontWeight: 900,
          color: INK,
        }}
      >
        {s.head}
      </div>
      <div
        style={{
          ...enter(frame, 10),
          position: "absolute",
          top: 290,
          left: 0,
          right: 0,
          fontSize: 54,
          fontWeight: 600,
          color: SUB,
        }}
      >
        {s.sub}
      </div>
      <div
        style={{
          position: "absolute",
          top: 440,
          left: 90,
          right: 90,
          display: "flex",
          flexDirection: "column",
          gap: 50,
        }}
      >
        {s.rows.map((r, i) => (
          <div
            key={r}
            style={{
              ...enter(frame, 20 + i * 20),
              display: "flex",
              alignItems: "center",
              gap: 44,
              textAlign: "left",
            }}
          >
            <div style={{ flex: "none" }}>{SIGN_ICONS[s.icons[i]]}</div>
            <div style={{ fontSize: 72, fontWeight: 800, color: INK }}>{r}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Summary: React.FC<{ s: Extract<Scene, { type: "summary" }> }> = ({
  s,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{ padding: "120px 90px 760px", justifyContent: "center", gap: 34 }}
    >
      <div
        style={{
          ...enter(frame, 0),
          fontSize: 100,
          fontWeight: 900,
          color: INK,
          marginBottom: 30,
        }}
      >
        {s.title}
      </div>
      {s.rows.map((r, i) => (
        <div
          key={r}
          style={{
            ...enter(frame, 12 + i * 12),
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          <div
            style={{
              fontSize: 130,
              fontWeight: 900,
              color: ACCENT,
              width: 110,
            }}
          >
            {i + 1}
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, color: INK }}>{r}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ s: Extract<Scene, { type: "outro" }> }> = ({ s }) => {
  const frame = useCurrentFrame();
  return (
    <Center>
      <div
        style={{
          fontSize: 130,
          fontWeight: 900,
          color: INK,
          whiteSpace: "pre-line",
          lineHeight: 1.15,
          opacity: frame >= 14 ? 1 : 0,
          translate: `0px ${slam(frame, 14)}px`,
        }}
      >
        {s.text}
      </div>
      <div
        style={{
          ...enter(frame, 30),
          fontSize: 56,
          fontWeight: 500,
          color: SUB,
        }}
      >
        {s.sub}
      </div>
      {s.note ? (
        <div
          style={{
            ...enter(frame, 40),
            fontSize: 38,
            fontWeight: 500,
            color: "#999",
            marginTop: 30,
          }}
        >
          ※ {s.note}
        </div>
      ) : null}
    </Center>
  );
};

const gestureFor = (s: Scene): Gesture => {
  if (s.gesture) return s.gesture;
  switch (s.type) {
    case "hook":
      return "up";
    case "why":
      return "pointR";
    case "title":
      return "pointR";
    case "item":
      return s.n % 2 === 1 ? "pointR" : "pointL";
    case "signs":
      return "pointR";
    case "summary":
      return "count";
    case "outro":
      return "wave";
  }
};

const poseFor = (s: Scene, f: number, D: number): Pose => {
  if (s.move) return MOVES[s.move](f, D);
  switch (s.type) {
    case "hook":
      return hookPose(f);
    case "why":
      return whyPose(f);
    case "title":
      return titlePose(f);
    case "item":
      return itemPose(s.n === 4 && s.worry === false ? 5 : s.n, f, D);
    case "signs":
      return MOVES.nod(f, D);
    case "summary":
      return summaryPose(f, D);
    case "outro":
      return outroPose(f);
  }
};

const SceneView: React.FC<{ s: Scene; dur: number }> = ({ s, dur }) => (
  <>
    {s.deco === "snow" ? <Snow /> : null}
    <SceneBody s={s} dur={dur} />
  </>
);

const SceneBody: React.FC<{ s: Scene; dur: number }> = ({ s, dur }) => {
  switch (s.type) {
    case "hook":
      return <Hook s={s} />;
    case "why":
      return <Why s={s} />;
    case "title":
      return <Title s={s} />;
    case "item":
      return <Item s={s} dur={dur} />;
    case "signs":
      return <Signs s={s} />;
    case "summary":
      return <Summary s={s} />;
    case "outro":
      return <Outro s={s} />;
  }
};

// 캐릭터 레이어: 바닥선 아래는 잘라서 '땅으로 꺼지는' 연출을 만든다
const CharLayer: React.FC<{ s: Scene; start: number; dur: number }> = ({
  s,
  start,
  dur,
}) => {
  const f = useCurrentFrame();
  const pose = poseFor(s, f, dur);
  const surprised = s.type === "hook" || (s.type === "item" && s.n === 4 && s.worry !== false);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 40,
        clipPath: "inset(-3000px -3000px 40px -3000px)",
      }}
    >
      {s.audio ? (
        <CharacterTalking
          src={s.audio}
          gesture={gestureFor(s)}
          offset={start}
          surprised={surprised}
          pose={pose}
        />
      ) : (
        <CharacterSynthetic
          gesture={gestureFor(s)}
          offset={start}
          totalFrames={dur}
          surprised={surprised}
          pose={pose}
        />
      )}
    </AbsoluteFill>
  );
};

export const InfoCard: React.FC<InfoCardProps> = ({ scenes }) => {
  const { fps } = useVideoConfig();
  let from = 0;
  return (
    <AbsoluteFill
      name="InfoCard"
      style={{ backgroundColor: "#FFFFFF", fontFamily: FONT }}
    >
      {/* 바닥선 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1880,
          height: 6,
          background: "#E6E6E6",
        }}
      />
      {scenes.map((s, i) => {
        const dur = Math.round(s.seconds * fps);
        const start = from;
        from += dur;
        return (
          <Sequence key={i} from={start} durationInFrames={dur} layout="none">
            <Fade total={dur}>
              <SceneView s={s} dur={dur} />
            </Fade>
            <CharLayer s={s} start={start} dur={dur} />
            {s.audio ? <Audio src={staticFile(s.audio)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
