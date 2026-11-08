import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Easing,
  Interactive,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const fontFamily =
  '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

export type Line = { text: string; clip?: string; seconds: number };
export type ShortsProps = { bgm: string | null; lines: Line[] };

export const FPS = 30;

export const calculateShortsMetadata: CalculateMetadataFunction<ShortsProps> = ({ props }) => {
  const total = props.lines.reduce((sum, l) => sum + Math.round(l.seconds * FPS), 0);
  return { durationInFrames: Math.max(total, 1) };
};

const Scene: React.FC<{ line: Line }> = ({ line }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill name="Scene" style={{ backgroundColor: "#111" }}>
      {line.clip ? (
        <Video
          src={staticFile(`clips/${line.clip}`)}
          muted
          loop
          objectFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 380,
          paddingLeft: 60,
          paddingRight: 60,
        }}
      >
        <Interactive.Div
          name="Caption"
          style={{
            fontFamily,
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 1.3,
            textAlign: "center",
            whiteSpace: "pre-line",
            color: "white",
            WebkitTextStroke: "10px black",
            paintOrder: "stroke fill",
            opacity: interpolate(frame, [0, 0.25 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [0, 0.25 * fps], ["0px 30px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {line.text}
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Shorts: React.FC<ShortsProps> = ({ bgm, lines }) => {
  let from = 0;
  return (
    <AbsoluteFill name="Shorts">
      {lines.map((line, i) => {
        const dur = Math.round(line.seconds * FPS);
        const start = from;
        from += dur;
        return (
          <Sequence key={i} from={start} durationInFrames={dur} layout="none">
            <Scene line={line} />
          </Sequence>
        );
      })}
      {bgm ? <Audio src={staticFile(bgm)} volume={0.25} loop /> : null}
    </AbsoluteFill>
  );
};
