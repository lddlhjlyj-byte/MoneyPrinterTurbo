import { useWindowedAudioData, visualizeAudio } from "@remotion/media-utils";
import {
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BASE, Pose } from "./choreo";

/**
 * 오리지널 캐릭터: 머리만 큰 마스코트 (몸통 없음, 짧은 팔·다리, 눈썹·코 없음) + 흰 가운
 * 눈 2개의 면적 합 = 얼굴 면적의 약 1/3 (눈 rx100·ry115 ×2 ≈ 72,256 / 얼굴 rx270·ry250 ≈ 212,058)
 */
export type Gesture = "idle" | "up" | "pointR" | "pointL" | "count" | "wave";

const SKIN = "#FFD84D";
const SKIN_LIGHT = "#FFF1A8";
const LINE = "#111111";
const COAT = "#FFFFFF";
const HEAD_Y = -36; // 머리를 위로 올려 가운이 보이게 함

const armTarget = (g: Gesture, f: number): { l: number; r: number } => {
  const rest = 18;
  switch (g) {
    case "up":
      return {
        l: 125 + 10 * Math.sin(f * 0.4),
        r: 125 + 10 * Math.sin(f * 0.4 + 1),
      };
    case "pointR":
      return { l: rest, r: 105 + 8 * Math.sin(f * 0.25) };
    case "pointL":
      return { l: 105 + 8 * Math.sin(f * 0.25), r: rest };
    case "count":
      return { l: rest, r: 75 + 30 * Math.abs(Math.sin(f * 0.16)) };
    case "wave":
      return { l: rest, r: 120 + 24 * Math.sin(f * 0.5) };
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
  pose: Pose;
};

const CharacterView: React.FC<ViewProps> = ({
  mouth,
  gesture,
  localFrame,
  globalFrame,
  surprised,
  pose,
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
  let angL = rest + (t.l - rest) * enter;
  let angR = rest + (t.r - rest) * enter;
  angL += (pose.armA - angL) * pose.armW;
  angR += (pose.armA - angR) * pose.armW;

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

  // 팔: 손(노랑) + 흰 가운 소매
  const arm = (side: "L" | "R", ang: number) => {
    const x = side === "L" ? 128 : 472;
    const rot = side === "L" ? ang : -ang;
    return (
      <g transform={`translate(${x},505) rotate(${rot})`}>
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="104"
          stroke={LINE}
          strokeWidth="56"
          strokeLinecap="round"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="104"
          stroke={SKIN}
          strokeWidth="42"
          strokeLinecap="round"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="60"
          stroke={LINE}
          strokeWidth="56"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="58"
          stroke={COAT}
          strokeWidth="42"
        />
        <line x1="-21" y1="60" x2="21" y2="60" stroke={LINE} strokeWidth="5" />
      </g>
    );
  };

  const leg = (x: number, shoeX: number) => (
    <g>
      <line
        x1={x}
        y1="560"
        x2={x}
        y2="598"
        stroke={LINE}
        strokeWidth="56"
        strokeLinecap="round"
      />
      <line
        x1={x}
        y1="560"
        x2={x}
        y2="598"
        stroke={SKIN}
        strokeWidth="42"
        strokeLinecap="round"
      />
      <ellipse cx={shoeX} cy={614} rx={44} ry={16} fill={LINE} />
    </g>
  );

  return (
    <div style={{ translate: `${pose.x}px ${pose.y + pose.sink * 720}px` }}>
      <div style={{ rotate: `${pose.rot}deg` }}>
        <div
          style={{
            transformOrigin: "50% 100%",
            scale: `${pose.sx} ${pose.sy}`,
          }}
        >
          <svg
            viewBox="0 0 600 640"
            width="560"
            height="597"
            style={{ overflow: "visible", display: "block" }}
          >
            <ellipse
              cx="300"
              cy="626"
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

              {/* 흰 가운 (짧은 가운이 머리 아래로 드리워진 형태) */}
              <path
                d="M 140 440 L 460 440 L 488 580 Q 490 592 476 592 L 124 592 Q 110 592 112 580 Z"
                fill={COAT}
                stroke={LINE}
                strokeWidth="8"
                strokeLinejoin="round"
              />
              <line
                x1="300"
                y1="520"
                x2="300"
                y2="592"
                stroke={LINE}
                strokeWidth="5"
              />
              <circle cx="322" cy="552" r="6" fill={LINE} />
              <circle cx="322" cy="576" r="6" fill={LINE} />
              <path
                d="M 166 536 H 226 V 576 H 166 Z"
                fill="none"
                stroke={LINE}
                strokeWidth="5"
                strokeLinejoin="round"
              />
              <rect x="180" y="520" width="9" height="26" rx="3" fill={LINE} />

              {arm("L", angL)}
              {arm("R", angR)}

              <g transform={`rotate(${tilt} 300 520)`}>
                <g transform={`translate(0,${HEAD_Y})`}>
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
                {/* 가운 옷깃 */}
                <polygon
                  points="214,500 298,576 258,500"
                  fill={COAT}
                  stroke={LINE}
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <polygon
                  points="386,500 302,576 342,500"
                  fill={COAT}
                  stroke={LINE}
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                {pose.star > 0
                  ? [0, 1, 2, 3, 4, 5].map((i) => {
                      const a = (-150 + i * 60) * (Math.PI / 180);
                      const r = 330 + 170 * pose.star;
                      const cx = 300 + Math.cos(a) * r * 1.05;
                      const cy = 270 + Math.sin(a) * r * 0.9;
                      const k = 1 - pose.star * 0.5;
                      return (
                        <polygon
                          key={i}
                          transform={`translate(${cx},${cy}) rotate(${pose.star * 120 + i * 20}) scale(${k})`}
                          points="0,-30 9,-10 30,-9 13,5 19,26 0,14 -19,26 -13,5 -30,-9 -9,-10"
                          fill={SKIN}
                          stroke={LINE}
                          strokeWidth="5"
                          strokeLinejoin="round"
                          opacity={1 - pose.star * 0.6}
                        />
                      );
                    })
                  : null}
                {pose.sweat > 0 ? (
                  <g transform={`translate(500,${70 + 12 * Math.abs(Math.sin(f * 0.2))})`}>
                    <path
                      d="M 0 -34 C 0 -34 -26 4 -26 20 C -26 36 -14 46 0 46 C 14 46 26 36 26 20 C 26 4 0 -34 0 -34 Z"
                      fill="#BFE6FF"
                      stroke={LINE}
                      strokeWidth="5"
                      strokeLinejoin="round"
                    />
                  </g>
                ) : null}
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

// 음성 파일이 없을 때: 말하는 것처럼 보이는 가짜 입 모양
export const CharacterSynthetic: React.FC<{
  gesture: Gesture;
  offset: number;
  totalFrames: number;
  surprised?: boolean;
  pose?: Pose;
}> = ({ gesture, offset, totalFrames, surprised, pose = BASE }) => {
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
      pose={pose}
    />
  );
};

// 음성 파일이 있을 때: 실제 소리 크기에 맞춰 입을 벌린다
export const CharacterTalking: React.FC<{
  src: string;
  gesture: Gesture;
  offset: number;
  surprised?: boolean;
  pose?: Pose;
}> = ({ src, gesture, offset, surprised, pose = BASE }) => {
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
      pose={pose}
    />
  );
};

// 채널 프로필·배너용 정지 캐릭터
export const CharacterStill: React.FC<{ mouth?: number }> = ({ mouth = 0.28 }) => (
  <CharacterView
    mouth={mouth}
    gesture="idle"
    localFrame={30}
    globalFrame={0}
    pose={BASE}
  />
);
