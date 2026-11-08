import { useWindowedAudioData, visualizeAudio } from "@remotion/media-utils";
import {
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * 오리지널 캐릭터: 머리만 큰 마스코트 (몸통 없음, 짧은 팔·다리, 눈썹·코 없음)
 * 눈 2개의 면적 합 = 얼굴 면적의 약 1/3 (눈 rx100·ry115 ×2 ≈ 72,256 / 얼굴 rx270·ry250 ≈ 212,058)
 */
export type Gesture = "idle" | "up" | "pointR" | "pointL" | "count" | "wave";

const SKIN = "#FFD84D";
const SKIN_LIGHT = "#FFF1A8";
const LINE = "#111111";

const armTarget = (g: Gesture, f: number): { l: number; r: number } => {
  const rest = 18;
  switch (g) {
    case "up":
      return {
        l: 150 + 12 * Math.sin(f * 0.4),
        r: 150 + 12 * Math.sin(f * 0.4 + 1),
      };
    case "pointR":
      return { l: rest, r: 135 + 8 * Math.sin(f * 0.25) };
    case "pointL":
      return { l: 135 + 8 * Math.sin(f * 0.25), r: rest };
    case "count":
      return { l: rest, r: 95 + 28 * Math.abs(Math.sin(f * 0.16)) };
    case "wave":
      return { l: rest, r: 140 + 24 * Math.sin(f * 0.5) };
    default:
      return {
        l: rest + 3 * Math.sin(f * 0.1),
        r: rest + 3 * Math.sin(f * 0.1 + 2),
      };
  }
};

type ViewProps = {
  mouth: number; // 0~1
  gesture: Gesture;
  localFrame: number; // 장면 안에서의 프레임 (제스처 진입용)
  globalFrame: number; // 전체 프레임 (통통 튀기·깜빡임 연속성)
  surprised?: boolean;
};

const CharacterView: React.FC<ViewProps> = ({
  mouth,
  gesture,
  localFrame,
  globalFrame,
  surprised,
}) => {
  const f = globalFrame;
  const hop = Math.abs(Math.sin(f * 0.16));
  const bobY = -hop * 14;
  const squash = 1 + 0.02 * Math.sin(f * 0.32);
  const tilt = 2.5 * Math.sin(f * 0.09);

  const blinkPhase = (f + 40) % 96;
  const eyeScaleY = interpolate(blinkPhase, [0, 2, 5], [1, 0.08, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eyeGrow = surprised ? 1.07 : 1;

  const t = armTarget(gesture, f);
  const enter = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const rest = 18;
  const angL = rest + (t.l - rest) * enter;
  const angR = rest + (t.r - rest) * enter;

  const w = 30 + 12 * mouth;
  const h = 6 + 34 * mouth;
  const mouthPath = `M ${-w} 0 Q 0 -5 ${w} 0 C ${w} ${h * 1.35} ${-w} ${h * 1.35} ${-w} 0 Z`;

  const eye = (cx: number, key: string) => (
    <g
      key={key}
      transform={`translate(${cx},300) scale(${eyeGrow},${eyeScaleY * eyeGrow}) translate(${-cx},-300)`}
    >
      <ellipse cx={cx} cy={300} rx={100} ry={115} fill={LINE} />
      <circle cx={cx - 30} cy={255} r={30} fill="#fff" />
      <circle cx={cx + 36} cy={345} r={14} fill="#fff" />
    </g>
  );

  const arm = (side: "L" | "R", ang: number) => {
    const x = side === "L" ? 52 : 548;
    const rot = side === "L" ? ang : -ang;
    return (
      <g transform={`translate(${x},345) rotate(${rot})`}>
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="92"
          stroke={LINE}
          strokeWidth="56"
          strokeLinecap="round"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="92"
          stroke={SKIN}
          strokeWidth="42"
          strokeLinecap="round"
        />
      </g>
    );
  };

  const leg = (x: number, shoeX: number) => (
    <g>
      <line
        x1={x}
        y1="520"
        x2={x}
        y2="588"
        stroke={LINE}
        strokeWidth="56"
        strokeLinecap="round"
      />
      <line
        x1={x}
        y1="520"
        x2={x}
        y2="588"
        stroke={SKIN}
        strokeWidth="42"
        strokeLinecap="round"
      />
      <ellipse cx={shoeX} cy={606} rx={44} ry={18} fill={LINE} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 600 640"
      width="560"
      height="597"
      style={{ overflow: "visible" }}
    >
      <ellipse
        cx="300"
        cy="618"
        rx={150 - hop * 25}
        ry="14"
        fill="#000"
        opacity={0.12 - hop * 0.04}
      />
      <g
        transform={`translate(0,${bobY}) translate(300,610) scale(1,${squash}) translate(-300,-610)`}
      >
        {leg(232, 222)}
        {leg(368, 378)}
        {arm("L", angL)}
        {arm("R", angR)}
        <g transform={`rotate(${tilt} 300 540)`}>
          <ellipse
            cx="300"
            cy="300"
            rx="270"
            ry="250"
            fill={SKIN}
            stroke={LINE}
            strokeWidth="8"
          />
          <ellipse
            cx="170"
            cy="150"
            rx="78"
            ry="34"
            transform="rotate(-28 170 150)"
            fill={SKIN_LIGHT}
            opacity="0.75"
          />
          <ellipse
            cx="108"
            cy="452"
            rx="34"
            ry="20"
            fill="#FF8FA3"
            opacity="0.65"
          />
          <ellipse
            cx="492"
            cy="452"
            rx="34"
            ry="20"
            fill="#FF8FA3"
            opacity="0.65"
          />
          {eye(175, "l")}
          {eye(425, "r")}
          <g transform="translate(300,478)">
            <clipPath id="mouthClip">
              <path d={mouthPath} />
            </clipPath>
            <path
              d={mouthPath}
              fill="#7A1F2B"
              stroke={LINE}
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {mouth > 0.3 ? (
              <ellipse
                cx="0"
                cy={h * 1.0}
                rx={w * 0.6}
                ry={h * 0.3}
                fill="#FF7B8A"
                clipPath="url(#mouthClip)"
              />
            ) : null}
          </g>
        </g>
      </g>
    </svg>
  );
};

// 음성 파일이 없을 때: 말하는 것처럼 보이는 가짜 입 모양
export const CharacterSynthetic: React.FC<{
  gesture: Gesture;
  offset: number;
  totalFrames: number;
  surprised?: boolean;
}> = ({ gesture, offset, totalFrames, surprised }) => {
  const frame = useCurrentFrame();
  const speaking = frame > 4 && frame < totalFrames - 14;
  const mouth = speaking
    ? Math.max(0, Math.sin(frame * 0.95)) *
      (0.55 + 0.45 * Math.sin(frame * 0.23 + 1))
    : 0;
  return (
    <CharacterView
      mouth={mouth}
      gesture={gesture}
      localFrame={frame}
      globalFrame={frame + offset}
      surprised={surprised}
    />
  );
};

// 음성 파일이 있을 때: 실제 소리 크기에 맞춰 입을 벌린다
export const CharacterTalking: React.FC<{
  src: string;
  gesture: Gesture;
  offset: number;
  surprised?: boolean;
}> = ({ src, gesture, offset, surprised }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
    src: staticFile(src),
    frame,
    fps,
    windowInSeconds: 30,
  });
  let mouth = 0;
  if (audioData) {
    const bins = visualizeAudio({
      fps,
      frame,
      audioData,
      numberOfSamples: 32,
      optimizeFor: "speed",
      dataOffsetInSeconds,
    });
    const energy = bins.slice(1, 12).reduce((a, b) => a + b, 0) / 11;
    mouth = Math.min(1, energy * 10);
  }
  return (
    <CharacterView
      mouth={mouth}
      gesture={gesture}
      localFrame={frame}
      globalFrame={frame + offset}
      surprised={surprised}
    />
  );
};
