import { Easing, interpolate } from "remotion";

/**
 * 캐릭터 동선(안무). 모든 값은 장면 안의 프레임(f, 30fps) 기준.
 * x,y: 이동(px)  rot: 회전(도)  sx,sy: 찌그러짐  sink: 0~1 (1이면 바닥 아래로 완전히 꺼짐)
 * armA/armW: 팔 각도 강제값과 그 적용 비율(0~1)
 */
export type Pose = {
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  sink: number;
  armA: number;
  armW: number;
  star: number; // 착지 별 폭발 진행(0=없음)
  sweat: number; // 땀방울(0/1)
  lag: number; // 팔 따라오기(도, 몸 속도에 반대로 휘어짐)
};

export const BASE: Pose = {
  x: 0,
  y: 0,
  rot: 0,
  sx: 1,
  sy: 1,
  sink: 0,
  armA: 125,
  armW: 0,
  star: 0,
  sweat: 0,
  lag: 0,
};

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const lerp = (
  f: number,
  a: number[],
  b: number[],
  easing?: (t: number) => number,
) => interpolate(f, a, b, { ...CL, easing });

export const OUT = Easing.out(Easing.cubic);
export const IN = Easing.in(Easing.quad);
export const INOUT = Easing.inOut(Easing.quad);

/** t0부터 dur 프레임 동안 포물선 점프(높이 h) */
export const arc = (f: number, t0: number, dur: number, h: number) => {
  const u = (f - t0) / dur;
  return u <= 0 || u >= 1 ? 0 : -h * 4 * u * (1 - u);
};

/** 착지 순간 납작해졌다가 복원 */
const landSy = (f: number, t0: number) =>
  f < t0 ? 1 : lerp(f, [t0, t0 + 3, t0 + 11], [0.78, 0.78, 1]);

export const burst = (f: number, t0: number) =>
  f >= t0 && f < t0 + 16 ? (f - t0 + 1) / 17 : 0;

const withSy = (p: Pose, sy: number): Pose => ({
  ...p,
  sy,
  sx: 1 + (1 - sy) * 0.7,
});

// 캐릭터 손 높이(화면 y) 기준: 쉬는 자세에서 약 1520, 점프하면 y만큼 올라감
export const HANDS_REST_Y = 1520;
export const HOOK_APEX = -740;

export const hookPose = (f: number): Pose => {
  const jump =
    f < 64
      ? lerp(f, [46, 56], [0, HOOK_APEX], OUT)
      : lerp(f, [64, 78], [HOOK_APEX, 0], IN);
  const sy =
    f < 46
      ? lerp(f, [36, 45], [1, 0.8])
      : f < 78
        ? 1.08
        : landSy(f, 78);
  return withSy(
    {
      ...BASE,
      y: jump + arc(f, 8, 14, 70),
      sink: lerp(f, [0, 9], [1, 0], OUT),
      armA: 125,
      star: burst(f, 78),
      armW: lerp(f, [46, 52, 72, 80], [0, 1, 1, 0]),
    },
    sy,
  );
};

export const whyPose = (f: number): Pose =>
  withSy(
    {
      ...BASE,
      y: arc(f, 12, 26, 260),
      rot: lerp(f, [12, 38], [0, 720], INOUT),
      armA: 125,
      star: burst(f, 38),
      armW: lerp(f, [10, 16, 34, 42], [0, 1, 1, 0]),
    },
    landSy(f, 38),
  );

export const titlePose = (f: number): Pose =>
  withSy(
    {
      ...BASE,
      y: arc(f, 0, 12, 170),
      armA: 125,
      star: burst(f, 12),
      armW: lerp(f, [0, 5, 12, 18], [0, 1, 1, 0]),
    },
    landSy(f, 12),
  );

export const itemPose = (n: number, f: number, D: number): Pose => {
  if (n === 1) {
    // 왼쪽에서 달려 들어옴
    const run = f < 26;
    return {
      ...BASE,
      x: lerp(f, [0, 26], [-950, 0], OUT),
      y: run ? -Math.abs(Math.sin(f * 0.6)) * 36 * lerp(f, [0, 26], [1, 0.3]) : 0,
      rot: lerp(f, [0, 26], [-8, 0]),
    };
  }
  if (n === 2) {
    // 땅속에서 솟아올라 점프
    return withSy(
      {
        ...BASE,
        sink: lerp(f, [0, 20, 28], [1, 1, 0]),
        y: arc(f, 22, 22, 420),
        star: burst(f, 44),
      },
      landSy(f, 44),
    );
  }
  if (n === 3) {
    // 한 바퀴 회전 점프
    return withSy(
      {
        ...BASE,
        y: arc(f, 10, 22, 220),
        rot: lerp(f, [10, 32], [0, 360], INOUT),
        star: burst(f, 32),
      },
      landSy(f, 32),
    );
  }
  if (n >= 5) {
    // 밝은 마무리: 통통 뛰다가 땅으로 꺼짐
    return {
      ...BASE,
      y: arc(f, 12, 16, 170) + arc(f, 32, 16, 130),
      sink: lerp(f, [D - 22, D - 6], [0, 1], IN),
    };
  }
  // n === 4: 불안하게 떨다가 땅으로 꺼짐
  return {
    ...BASE,
    x: f > 10 && f < D - 24 ? 6 * Math.sin(f * 1.7) : 0,
    rot: -9 * lerp(f, [0, 8], [0, 1]) * lerp(f, [D - 24, D - 18], [1, 0]),
    sink: lerp(f, [D - 22, D - 6], [0, 1], IN),
    sweat: f > 10 && f < D - 20 ? 1 : 0,
  };
};

export const summaryPose = (f: number, D: number): Pose => ({
  ...BASE,
  y:
    arc(f, 12, 10, 100) +
    arc(f, 24, 10, 100) +
    arc(f, 36, 10, 100) +
    arc(f, 48, 10, 100),
  sink: lerp(f, [D - 22, D - 6], [0, 1], IN),
});

export const outroPose = (f: number): Pose =>
  withSy(
    {
      ...BASE,
      sink: lerp(f, [0, 8], [1, 0], OUT),
      y: arc(f, 6, 16, 220) + arc(f, 22, 26, 260),
      rot: lerp(f, [22, 48], [0, 360], INOUT),
      star: burst(f, 48),
    },
    landSy(f, 48),
  );


/* ───────── 새 동작들 (cards.json 장면의 "move"로 선택) ───────── */

// 덜덜 떨기 (추위): 몸을 움츠리고 빠르게 떨림
export const shiverPose = (f: number, D: number): Pose =>
  withSy(
    {
      ...BASE,
      x: f > 6 ? 7 * Math.sin(f * 2.1) : 0,
      rot: f > 6 ? 3 * Math.sin(f * 2.6 + 1) : 0,
      y: arc(f, 0, 10, 60),
      sink: lerp(f, [D - 14, D - 4], [0, 1], IN),
      sweat: 0,
    },
    0.94,
  );

// 갸웃: 고개(몸)를 기울이며 천천히 좌우로 흔들림 (생각/고민)
export const tiltPose = (f: number, D: number): Pose => ({
  ...BASE,
  x: lerp(f, [0, 14], [900, 0], OUT),
  rot: lerp(f, [14, 26], [0, -12], OUT) + 4 * Math.sin(f * 0.18) * lerp(f, [26, 34], [0, 1]),
  y: arc(f, 28, 14, 50),
  sink: lerp(f, [D - 14, D - 4], [0, 1], IN),
});

// 살랑살랑 춤: 좌우 이동하며 리듬 타기 (촉촉/편안)
export const swayPose = (f: number, D: number): Pose => ({
  ...BASE,
  x: lerp(f, [0, 12], [1000, 0], OUT) + (f > 12 ? 70 * Math.sin((f - 12) * 0.13) : 0),
  rot: f > 12 ? 11 * Math.sin((f - 12) * 0.13 + 1.3) : 0,
  y: f > 12 ? -Math.abs(Math.sin((f - 12) * 0.13)) * 40 : 0,
  sink: lerp(f, [D - 14, D - 4], [0, 1], IN),
});

// 통통 세 번 앞으로: 점프할 때마다 조금씩 커짐 (다가와서 알려줌)
export const hop3Pose = (f: number, D: number): Pose =>
  withSy(
    {
      ...BASE,
      y: arc(f, 4, 14, 150) + arc(f, 20, 14, 190) + arc(f, 36, 16, 240),
      rot: lerp(f, [36, 52], [0, -360], INOUT),
      star: burst(f, 52),
      sink: lerp(f, [D - 14, D - 4], [0, 1], IN),
    },
    landSy(f, 52),
  );

// 위아래로 끄덕이며 설명 (고개 끄덕)
export const nodPose = (f: number, D: number): Pose => ({
  ...BASE,
  y: lerp(f, [0, 10], [-900, 0], OUT) + (f > 12 ? 24 * Math.abs(Math.sin((f - 12) * 0.22)) * -1 : 0),
  sink: lerp(f, [D - 14, D - 4], [0, 1], IN),
});

export type MoveName =
  | "run"
  | "rise"
  | "spinJump"
  | "tremble"
  | "bounce"
  | "shiver"
  | "tilt"
  | "sway"
  | "hop3"
  | "nod";

export const MOVES: Record<MoveName, (f: number, D: number) => Pose> = {
  run: (f, D) => itemPose(1, f, D),
  rise: (f, D) => itemPose(2, f, D),
  spinJump: (f, D) => itemPose(3, f, D),
  tremble: (f, D) => itemPose(4, f, D),
  bounce: (f, D) => itemPose(5, f, D),
  shiver: shiverPose,
  tilt: tiltPose,
  sway: swayPose,
  hop3: hop3Pose,
  nod: nodPose,
};

/**
 * 자연스러운 움직임 보정(animation-principles 적용 테스트).
 * 예비동작(점프 직전 웅크림) · 늘어남(공중) · 팔 따라오기 · 숨쉬기.
 */
const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const naturalize =
  (fn: (f: number, D: number) => Pose) =>
  (f: number, D: number): Pose => {
    const p = fn(f, D);
    const prev = fn(f - 1, D);
    const next = fn(f + 5, D);
    const vy = p.y - prev.y; // 음수 = 올라가는 중
    let sx = p.sx;
    let sy = p.sy;
    let y = p.y;
    // 예비동작: 곧 뛰어오를 때 웅크림
    const ant = p.y > -4 ? clampN((p.y - next.y) / 70, 0, 1) : 0;
    sy *= 1 - 0.1 * ant;
    sx *= 1 + 0.05 * ant;
    y += 14 * ant;
    // 공중 늘어남
    if (p.y < -4) {
      const st = 1 + clampN(Math.abs(vy) / 60, 0, 0.1);
      sy *= st;
      sx /= Math.sqrt(st);
    }
    // 숨쉬기(거의 정지)
    if (Math.abs(vy) < 0.3 && ant === 0 && p.sink === 0) {
      const b = Math.sin(f * 0.18);
      sy *= 1 + 0.015 * b;
      sx *= 1 - 0.0075 * b;
    }
    return { ...p, sx, sy, y, lag: p.lag + clampN(-vy * 0.8, -30, 30) };
  };
