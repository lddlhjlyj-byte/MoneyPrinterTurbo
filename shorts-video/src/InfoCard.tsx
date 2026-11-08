import { Audio } from "@remotion/media";
import { CharacterSynthetic, CharacterTalking, Gesture } from "./Character";
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
const EASE = Easing.bezier(0.16, 1, 0.3, 1);

type Scene =
  | {
      type: "hook";
      seconds: number;
      line1: string;
      line2: string;
      warn: string;
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
      head: string;
      sub: string;
      tags: string[];
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
      audio?: string;
    };

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

const Hook: React.FC<{ s: Extract<Scene, { type: "hook" }> }> = ({ s }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + 0.03 * Math.sin((frame / FPS) * Math.PI * 3);
  const bar = interpolate(frame, [40, 70], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <Center gap={30}>
      <div
        style={{
          ...enter(frame, 0),
          fontSize: 150,
          fontWeight: 900,
          color: INK,
          scale: pulse,
        }}
      >
        {s.line1}
      </div>
      <div
        style={{
          ...enter(frame, 10),
          fontSize: 124,
          fontWeight: 900,
          color: INK,
        }}
      >
        {s.line2}
      </div>
      <div
        style={{
          ...enter(frame, 40),
          fontSize: 62,
          fontWeight: 700,
          color: INK,
          marginTop: 70,
        }}
      >
        {s.warn}
        <div
          style={{
            height: 10,
            background: INK,
            width: `${bar}%`,
            marginTop: 14,
            marginInline: "auto",
          }}
        />
      </div>
    </Center>
  );
};

const Title: React.FC<{ s: Extract<Scene, { type: "title" }> }> = ({ s }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [6, 30], [0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <Center gap={10}>
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
          opacity: t,
          scale: t,
          lineHeight: 1.1,
        }}
      >
        {s.num}
      </div>
    </Center>
  );
};

const Progress: React.FC<{ n: number }> = ({ n }) => (
  <div
    style={{
      position: "absolute",
      top: 90,
      left: 70,
      right: 70,
      display: "flex",
      gap: 16,
    }}
  >
    {[1, 2, 3, 4].map((i) => (
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

const Item: React.FC<{ s: Extract<Scene, { type: "item" }> }> = ({ s }) => {
  const frame = useCurrentFrame();
  const ring = interpolate(frame, [0, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const R = 190;
  const C = 2 * Math.PI * R;
  return (
    <>
      <Progress n={s.n} />
      <Center gap={50}>
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
            {s.n}
          </div>
        </div>
        <div
          style={{
            ...enter(frame, 14),
            fontSize: 124,
            fontWeight: 900,
            color: INK,
          }}
        >
          {s.head}
        </div>
        <div
          style={{
            ...enter(frame, 24),
            fontSize: 64,
            fontWeight: 500,
            color: SUB,
          }}
        >
          {s.sub}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 20 }}>
          {s.tags.map((tag, i) => (
            <div
              key={tag}
              style={{
                ...enter(frame, 34 + i * 7),
                fontSize: 52,
                fontWeight: 700,
                color: INK,
                border: `5px solid ${INK}`,
                borderRadius: 60,
                padding: "14px 38px",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </Center>
    </>
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
          fontSize: 110,
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
          <div style={{ fontSize: 78, fontWeight: 800, color: INK }}>{r}</div>
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
          ...enter(frame, 0),
          fontSize: 130,
          fontWeight: 900,
          color: INK,
        }}
      >
        {s.text}
      </div>
      <div
        style={{
          ...enter(frame, 12),
          fontSize: 62,
          fontWeight: 500,
          color: SUB,
        }}
      >
        {s.sub}
      </div>
    </Center>
  );
};

const gestureFor = (s: Scene): Gesture => {
  switch (s.type) {
    case "hook":
      return "up";
    case "title":
      return "pointR";
    case "item":
      return s.n % 2 === 1 ? "pointR" : "pointL";
    case "summary":
      return "count";
    case "outro":
      return "wave";
  }
};

const SceneView: React.FC<{ s: Scene }> = ({ s }) => {
  switch (s.type) {
    case "hook":
      return <Hook s={s} />;
    case "title":
      return <Title s={s} />;
    case "item":
      return <Item s={s} />;
    case "summary":
      return <Summary s={s} />;
    case "outro":
      return <Outro s={s} />;
  }
};

export const InfoCard: React.FC<InfoCardProps> = ({ scenes }) => {
  const { fps } = useVideoConfig();
  let from = 0;
  return (
    <AbsoluteFill
      name="InfoCard"
      style={{ backgroundColor: "#FFFFFF", fontFamily: FONT }}
    >
      {scenes.map((s, i) => {
        const dur = Math.round(s.seconds * fps);
        const start = from;
        from += dur;
        return (
          <Sequence key={i} from={start} durationInFrames={dur} layout="none">
            <Fade total={dur}>
              <SceneView s={s} />
            </Fade>
            <AbsoluteFill
              style={{
                justifyContent: "flex-end",
                alignItems: "center",
                paddingBottom: 40,
              }}
            >
              {s.audio ? (
                <CharacterTalking
                  src={s.audio}
                  gesture={gestureFor(s)}
                  offset={start}
                  surprised={s.type === "hook"}
                />
              ) : (
                <CharacterSynthetic
                  gesture={gestureFor(s)}
                  offset={start}
                  totalFrames={dur}
                  surprised={s.type === "hook"}
                />
              )}
            </AbsoluteFill>
            {s.audio ? <Audio src={staticFile(s.audio)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
