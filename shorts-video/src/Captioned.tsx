import { Video } from "@remotion/media";
import { createTikTokStyleCaptions, parseSrt } from "@remotion/captions";
import type { Caption, TikTokPage } from "@remotion/captions";
import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from "remotion";

const fontFamily =
  '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

const SWITCH_CAPTIONS_EVERY_MS = 1500;
const HIGHLIGHT_COLOR = "#FFE600";

export type CaptionedProps = {
  /** public/ 안의 영상 파일명 */
  video: string;
  /** public/ 안의 자막 파일명 (.json 또는 .srt) */
  captions: string;
};

export const calculateCaptionedMetadata: CalculateMetadataFunction<
  CaptionedProps
> = async ({ props }) => {
  const input = new Input({
    source: new UrlSource(staticFile(props.video)),
    formats: ALL_FORMATS,
  });
  const seconds = await input.computeDuration();
  return { durationInFrames: Math.max(1, Math.round(seconds * 30)) };
};

const CaptionPage: React.FC<{ page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absoluteTimeMs = page.startMs + (frame / fps) * 1000;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 380,
        paddingLeft: 60,
        paddingRight: 60,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1.3,
          textAlign: "center",
          whiteSpace: "pre-wrap",
          WebkitTextStroke: "10px black",
          paintOrder: "stroke fill",
        }}
      >
        {page.tokens.map((token, i) => {
          const active =
            token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;
          return (
            <span
              key={`${token.fromMs}-${i}`}
              style={{ color: active ? HIGHLIGHT_COLOR : "white" }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Captioned: React.FC<CaptionedProps> = ({
  video,
  captions: captionsFile,
}) => {
  const { fps } = useVideoConfig();
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  const load = useCallback(async () => {
    try {
      const res = await fetch(staticFile(captionsFile));
      if (captionsFile.toLowerCase().endsWith(".srt")) {
        setCaptions(parseSrt({ input: await res.text() }).captions);
      } else {
        setCaptions(await res.json());
      }
      continueRender(handle);
    } catch (e) {
      cancelRender(e);
    }
  }, [captionsFile, continueRender, cancelRender, handle]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = useMemo(
    () =>
      captions
        ? createTikTokStyleCaptions({
            captions,
            combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
          }).pages
        : [],
    [captions],
  );

  if (!captions) {
    return null;
  }

  return (
    <AbsoluteFill name="Captioned" style={{ backgroundColor: "#111" }}>
      <Video
        src={staticFile(video)}
        objectFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
      {pages.map((page, i) => {
        const next = pages[i + 1] ?? null;
        const start = Math.round((page.startMs / 1000) * fps);
        const endMs = Math.min(
          next ? next.startMs : Infinity,
          page.startMs + page.durationMs,
        );
        const end = Math.round((endMs / 1000) * fps);
        if (end - start <= 0) {
          return null;
        }
        return (
          <Sequence key={i} from={start} durationInFrames={end - start}>
            <CaptionPage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
