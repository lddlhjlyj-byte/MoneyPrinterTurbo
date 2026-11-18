import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

/**
 * 시청 유지용 '비트' 레이어 (사용자 요구: 2~3초마다 화면 전환·자막 크기 변화·효과음).
 * 장면의 voice를 한 호흡(약 2~3초) 단위로 쪼개 비트마다
 *  - 자막이 새로 튀어나오고(크기 변화·방향 교대, 숫자는 크게+강조색)
 *  - 화면이 살짝 펀치 줌 되며
 *  - 효과음(틱, 숫자에는 딩, 장면 시작에는 휘익)이 난다.
 * 타이밍은 tts.py가 잰 말하는 구간(speechStart/speechEnd)을 글자 수 비율로 나눈 추정값이다.
 */
export type BeatScene = {
  voice?: string;
  seconds: number;
  speechStart?: number;
  speechEnd?: number;
};
export type Beat = { text: string; from: number; to: number };

const FONT =
  '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const INK = "#111111";
const ACCENT = "#E5322D"; // 색 강조는 숫자에만
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const NUMBER = /(\d[\d,.]*\s?(?:분|초|도|%|회|번|가지|시간|개|겹|일|주|배|ml|mg|g)?)/g;

const MAX = 20; // 한 비트 목표 글자 수(말하면 약 2.5초)
const MIN = 8; // 이보다 짧으면 이웃과 합친다

/** voice를 한 호흡 단위로 자른다: 문장부호 → 짧은 조각 합치기 → 긴 조각은 공백 기준 균등 분할 */
export const splitBeats = (voice: string): string[] => {
  const raw = voice
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?。,，])\s*/)
    .filter(Boolean);
  const merged: string[] = [];
  for (const p of raw) {
    const last = merged[merged.length - 1];
    if (last !== undefined && (last.length < MIN || p.length < MIN) && last.length + 1 + p.length <= MAX + 4) {
      merged[merged.length - 1] = `${last} ${p}`;
    } else {
      merged.push(p);
    }
  }
  const out: string[] = [];
  for (const m of merged) {
    if (m.length <= MAX + 4) {
      out.push(m);
      continue;
    }
    const words = m.split(" ");
    const k = Math.ceil(m.length / MAX);
    const target = m.length / k;
    let cur = "";
    for (const w of words) {
      if (cur && (cur + " " + w).length > target + 3 && out.length >= 0) {
        out.push(cur);
        cur = w;
      } else {
        cur = cur ? `${cur} ${w}` : w;
      }
    }
    if (cur) out.push(cur);
  }
  return out;
};

/** 비트별 시작·끝 프레임(장면 시작 기준). 말하는 구간을 글자 수(+문장부호 쉼 가중)로 나눈다 */
export const beatFrames = (s: BeatScene, dur: number, fps: number): Beat[] => {
  const texts = s.voice ? splitBeats(s.voice) : [];
  if (!texts.length) return [];
  const start = Math.round((s.speechStart ?? 0.15) * fps);
  const end = Math.min(
    dur,
    Math.round((s.speechEnd ?? Math.max(s.seconds - 0.7, 1)) * fps),
  );
  const span = Math.max(texts.length, end - start);
  const w = texts.map(
    (t) => t.replace(/\s/g, "").length + (/[.!?。]$/.test(t) ? 2 : /[,，]$/.test(t) ? 1 : 0),
  );
  const sum = w.reduce((a, b) => a + b, 0);
  const beats: Beat[] = [];
  let acc = 0;
  texts.forEach((t, i) => {
    const from = i === 0 ? 0 : Math.round(start + (acc / sum) * span);
    acc += w[i];
    const to = i === texts.length - 1 ? dur : Math.round(start + (acc / sum) * span);
    beats.push({ text: t, from, to: Math.max(to, from + 1) });
  });
  return beats;
};

const current = (beats: Beat[], f: number) => {
  let idx = 0;
  for (let i = 0; i < beats.length; i++) if (f >= beats[i].from) idx = i;
  return idx;
};

/** 화면 펀치: 비트가 바뀔 때마다 장면이 살짝 확대됐다가 돌아온다(기준점은 비트마다 교대) */
export const BeatPunch: React.FC<{ beats: Beat[]; children: React.ReactNode }> = ({
  beats,
  children,
}) => {
  const f = useCurrentFrame();
  if (!beats.length) return <>{children}</>;
  const idx = current(beats, f);
  const local = f - beats[idx].from;
  const amp = idx === 0 ? 0 : 0.055 * Math.exp(-local / 4.5);
  const origin = ["50% 38%", "30% 34%", "70% 34%"][idx % 3];
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + amp})`, transformOrigin: origin }}>
      {children}
    </AbsoluteFill>
  );
};

const renderNumbers = (text: string) =>
  text.split(NUMBER).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ color: ACCENT, fontSize: "1.28em", fontWeight: 900 }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );

/** 자막: 비트마다 새로 튀어나옴. 등장 방식을 3가지로 돌려 쓰고 숫자는 크게+강조색 */
export const BeatCaptions: React.FC<{ beats: Beat[] }> = ({ beats }) => {
  const f = useCurrentFrame();
  if (!beats.length) return null;
  const idx = current(beats, f);
  const b = beats[idx];
  const local = f - b.from;
  const kind = idx % 3;
  const dir = idx % 2 === 0 ? 1 : -1;
  const t = interpolate(local, [0, 9], [0, 1], {
    extrapolateRight: "clamp",
    easing: OUT,
  });
  const scale =
    kind === 0 ? interpolate(local, [0, 4, 9], [1.45, 0.94, 1], { extrapolateRight: "clamp" }) : 1;
  const x = kind === 1 ? (1 - t) * 260 * dir : 0;
  const y = kind === 2 ? (1 - t) * -140 : (1 - t) * 24;
  const rot = (1 - t) * 3 * dir;
  const fade = interpolate(local, [0, 3], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 1075,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 56,
          lineHeight: 1.25,
          color: INK,
          textAlign: "center",
          wordBreak: "keep-all",
          maxWidth: 920,
          opacity: fade,
          transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
          WebkitTextStroke: "12px #FFFFFF",
          paintOrder: "stroke fill",
        }}
      >
        {renderNumbers(b.text)}
      </div>
    </AbsoluteFill>
  );
};

const SFX = {
  whoosh: { file: "sfx/whoosh.wav", volume: 0.22, frames: 18 },
  tick: { file: "sfx/tick.wav", volume: 0.16, frames: 8 },
  ding: { file: "sfx/ding.wav", volume: 0.2, frames: 26 },
} as const;

/** 효과음: 장면 시작 휘익, 비트마다 틱, 숫자가 나오는 비트는 딩 */
export const BeatSfx: React.FC<{ beats: Beat[] }> = ({ beats }) => (
  <>
    <Sequence from={0} durationInFrames={SFX.whoosh.frames} layout="none">
      <Audio src={staticFile(SFX.whoosh.file)} volume={SFX.whoosh.volume} />
    </Sequence>
    {beats.slice(1).map((b, i) => (
      <Sequence key={`t${i}`} from={b.from} durationInFrames={SFX.tick.frames} layout="none">
        <Audio src={staticFile(SFX.tick.file)} volume={SFX.tick.volume} />
      </Sequence>
    ))}
    {beats.map((b, i) =>
      /\d/.test(b.text) ? (
        <Sequence key={`d${i}`} from={b.from + 3} durationInFrames={SFX.ding.frames} layout="none">
          <Audio src={staticFile(SFX.ding.file)} volume={SFX.ding.volume} />
        </Sequence>
      ) : null,
    )}
  </>
);
