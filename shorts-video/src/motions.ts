import { BASE, IN, INOUT, OUT, Pose, arc, burst, lerp } from "./choreo";

/**
 * 사람 동작 100개 (cards.json 장면의 "move"에 이름을 넣어 사용).
 * 팔 각도: 0=아래, 90=옆, 180=위, 음수=몸 안쪽. 다리 각도: +면 발이 왼쪽으로.
 * 시간 단위는 프레임(30fps). t = 등장 동작이 끝난 뒤 흐른 프레임.
 */
type Body = Partial<Pose>;
type Enter = "drop" | "left" | "right" | "rise" | "pop" | "skid";

const ENT: Record<Enter, { end: number; at: (f: number) => Partial<Pose> }> = {
  drop: { end: 12, at: (f) => ({ y: lerp(f, [0, 10], [-900, 0], OUT) }) },
  left: { end: 12, at: (f) => ({ x: lerp(f, [0, 12], [-1000, 0], OUT) }) },
  right: { end: 12, at: (f) => ({ x: lerp(f, [0, 12], [1000, 0], OUT) }) },
  rise: { end: 10, at: (f) => ({ sink: lerp(f, [0, 10], [1, 0], OUT) }) },
  pop: {
    end: 10,
    at: (f) => {
      const k = lerp(f, [0, 5, 10], [0.2, 1.15, 1]);
      return { sx: k, sy: k, sink: lerp(f, [0, 3], [1, 0]) };
    },
  },
  skid: {
    end: 22,
    at: (f) => ({ x: lerp(f, [0, 22], [1100, 0], OUT), rot: lerp(f, [0, 22], [-12, 0], OUT) }),
  },
};

const S = (t: number, w: number, p = 0) => Math.sin(t * w + p);
const A = Math.abs;
const pos = (v: number) => Math.max(0, v);
const bump = (u: number, a: number, b: number, c: number, d: number) =>
  lerp(u, [a, b, c, d], [0, 1, 1, 0], INOUT);
const tri = (p: number) => {
  const q = p - Math.floor(p);
  return q < 0.5 ? 4 * q - 1 : 3 - 4 * q;
};
/** 눌림(sy)과 함께 옆으로 퍼짐(sx)을 같이 계산 */
const sq = (sy: number) => ({ sy, sx: 1 + (1 - sy) * 0.7 });

const mk =
  (enter: Enter, body: (t: number, D: number, f: number) => Body) =>
  (f: number, D: number): Pose => {
    const e = ENT[enter];
    const en = e.at(f);
    const t = Math.max(0, f - e.end);
    const b = body(t, D, f);
    const on = lerp(f, [e.end, e.end + 6], [0, 1]);
    return {
      ...BASE,
      ...b,
      x: (en.x ?? 0) + (b.x ?? 0),
      y: (en.y ?? 0) + (b.y ?? 0),
      rot: (en.rot ?? 0) + (b.rot ?? 0),
      sx: (en.sx ?? 1) * (b.sx ?? 1),
      sy: (en.sy ?? 1) * (b.sy ?? 1),
      sink: Math.max(en.sink ?? 0, b.sink ?? 0, lerp(f, [D - 14, D - 4], [0, 1], IN)),
      aLW: b.aL === undefined ? undefined : (b.aLW ?? on),
      aRW: b.aR === undefined ? undefined : (b.aRW ?? on),
    };
  };

export type MotionInfo = {
  label: string;
  cat: "인사·소통" | "이동" | "감정" | "일상" | "운동·춤" | "연출";
  fn: (f: number, D: number) => Pose;
};
const d = (
  cat: MotionInfo["cat"],
  label: string,
  enter: Enter,
  body: (t: number, D: number, f: number) => Body,
): MotionInfo => ({ cat, label, fn: mk(enter, body) });

// 걷기 다리 흔들기(번갈아 한쪽씩 들어 올림)
const stepL = (t: number, w: number, a: number) => pos(S(t, w)) * a;
const stepR = (t: number, w: number, a: number) => -pos(-S(t, w)) * a;

export const MOTIONS = {
  /* ───── 인사·소통 (12) ───── */
  hello: d("인사·소통", "손 흔들며 인사", "left", (t) => ({
    aR: 115 + 28 * S(t, 0.55),
    rot: 3 * S(t, 0.25),
    y: -A(S(t, 0.25)) * 8,
    hr: 5 * S(t, 0.25),
  })),
  bow: d("인사·소통", "공손한 절", "drop", (t) => {
    const p = bump(t % 90, 4, 16, 36, 50);
    return { ...sq(1 - 0.14 * p), hy: 34 * p, hr: -2 * p, y: 8 * p, aL: 18 - 8 * p, aR: 18 - 8 * p };
  }),
  bowTwice: d("인사·소통", "두 번 연달아 절", "drop", (t) => {
    const u = t % 110;
    const p = bump(u, 2, 10, 14, 22) + bump(u, 30, 38, 42, 50);
    return { ...sq(1 - 0.13 * p), hy: 30 * p, y: 7 * p };
  }),
  highFive: d("인사·소통", "하이파이브", "right", (t) => {
    const u = t % 80;
    return {
      aR: lerp(u, [0, 8, 22, 34], [18, 132, 132, 18]),
      y: arc(u, 6, 14, 55),
      rot: 5 * bump(u, 4, 10, 24, 34),
      star: burst(u, 12),
    };
  }),
  applaud: d("인사·소통", "박수치기", "pop", (t) => {
    const v = 0.5 + 0.5 * S(t, 0.75);
    const a = -12 + 70 * v;
    return { aL: a, aR: a, y: -A(S(t, 0.75)) * 10, mouthMin: 0.25, fx: "spark" };
  }),
  nodYes: d("인사·소통", "끄덕끄덕 동의", "drop", (t) => ({
    hy: 24 * A(S(t, 0.3)),
    hr: 3 * S(t, 0.3),
    y: -A(S(t, 0.3)) * 6,
  })),
  shakeNo: d("인사·소통", "도리도리 거절", "left", (t) => ({
    hr: 14 * S(t, 0.45),
    look: 18 * S(t, 0.45, 0.8),
    x: 8 * S(t, 0.45),
    aL: 18,
    aR: 18,
  })),
  shrug: d("인사·소통", "어깨 으쓱 모르겠음", "rise", (t) => {
    const u = t % 70;
    const p = bump(u, 4, 12, 34, 44);
    return { aL: 18 + 55 * p, aR: 18 + 55 * p, y: -14 * p, hr: 9 * p, ...sq(1 - 0.04 * p), fx: p > 0.3 ? "q" : undefined };
  }),
  beckon: d("인사·소통", "이리 오라는 손짓", "right", (t) => ({
    aR: 108 + 28 * S(t, 0.5),
    hr: 6,
    rot: 4 + 2 * S(t, 0.5),
    x: -20 * S(t, 0.25),
    mouthMin: 0.15,
  })),
  salute: d("인사·소통", "경례", "pop", (t) => ({
    aR: lerp(t, [2, 8], [18, 132]) + 2 * S(t, 0.2),
    ...sq(1.04),
    y: arc(t, 0, 10, 20) * (t < 12 ? 1 : 0),
    hr: -3,
    look: 0,
  })),
  blowKiss: d("인사·소통", "뽀뽀 날리기", "left", (t) => {
    const u = t % 90;
    return {
      aR: lerp(u, [0, 10, 22, 34], [18, 150, 105, 18]),
      front: u > 6 && u < 30,
      blush: 0.7,
      hr: 6 * bump(u, 6, 16, 28, 40),
      mouthMin: 0.2 * bump(u, 6, 14, 18, 26),
      fx: u > 18 && u < 75 ? "heart" : undefined,
    };
  }),
  waveBoth: d("인사·소통", "두 팔 흔들기", "pop", (t) => ({
    aL: 118 + 22 * S(t, 0.5),
    aR: 118 + 22 * S(t, 0.5, Math.PI),
    y: -A(S(t, 0.5)) * 8,
    rot: 4 * S(t, 0.25),
  })),

  /* ───── 이동 (14) ───── */
  walk: d("이동", "제자리 걷기", "left", (t) => ({
    lgL: stepL(t, 0.5, 26),
    lgR: stepR(t, 0.5, 26),
    aL: 18 + 22 * S(t, 0.5),
    aR: 18 - 22 * S(t, 0.5),
    y: -A(S(t, 0.5)) * 14,
    rot: 2.5 * S(t, 0.5),
    x: 25 * S(t, 0.08),
  })),
  run: d("이동", "전력 질주", "left", (t) => ({
    lgL: stepL(t, 0.9, 40),
    lgR: stepR(t, 0.9, 40),
    aL: 40 + 45 * S(t, 0.9),
    aR: 40 - 45 * S(t, 0.9),
    y: -A(S(t, 0.9)) * 30,
    rot: 7,
    x: 15 * S(t, 0.2),
  })),
  sneak: d("이동", "살금살금", "rise", (t) => ({
    ...sq(0.82),
    lgL: stepL(t, 0.25, 18),
    lgR: stepR(t, 0.25, 18),
    look: 25 * S(t, 0.2),
    x: 120 * S(t, 0.06),
    rot: 5 * S(t, 0.06, 1.2),
    aL: 30,
    aR: 30,
    hy: 8,
  })),
  skip: d("이동", "신나게 스킵", "left", (t) => ({
    y: -A(S(t, 0.4)) * 60,
    lgL: stepL(t, 0.4, 35),
    lgR: stepR(t, 0.4, 35),
    aL: 60 + 50 * S(t, 0.4),
    aR: 60 - 50 * S(t, 0.4),
    rot: 4 * S(t, 0.4),
    x: 40 * S(t, 0.1),
  })),
  tiptoe: d("이동", "까치발", "drop", (t) => ({
    y: -26 * lerp(t, [0, 8], [0, 1]),
    sy: 1.06,
    sx: 0.97,
    aL: 25,
    aR: 25,
    rot: 3 * S(t, 0.3),
    hy: -6,
  })),
  moonwalk: d("이동", "문워크", "right", (t) => ({
    x: 140 * S(t, 0.07),
    lgL: stepL(t, 0.5, 14),
    lgR: stepR(t, 0.5, 14),
    rot: -4,
    aL: 22,
    aR: 22,
    look: 14 * S(t, 0.07),
    y: -A(S(t, 0.5)) * 6,
  })),
  march: d("이동", "씩씩한 행진", "left", (t) => ({
    lgL: stepL(t, 0.35, 34),
    lgR: stepR(t, 0.35, 34),
    aL: 55 + 45 * S(t, 0.35),
    aR: 55 - 45 * S(t, 0.35),
    y: -A(S(t, 0.35)) * 18,
    hy: -4,
  })),
  skidIn: d("이동", "미끄러지며 등장", "skid", (t) => ({
    y: -6 * S(t, 0.12),
    hr: 3 * S(t, 0.1),
    aL: 18,
    aR: 18,
  })),
  zigzag: d("이동", "지그재그 이동", "left", (t) => ({
    x: 220 * S(t, 0.09),
    rot: 8 * S(t, 0.09, Math.PI / 2),
    y: -A(S(t, 0.18)) * 20,
    lgL: stepL(t, 0.36, 22),
    lgR: stepR(t, 0.36, 22),
  })),
  pace: d("이동", "왔다갔다 서성임", "left", (t) => ({
    x: 220 * tri(t / 160),
    lgL: stepL(t, 0.4, 20),
    lgR: stepR(t, 0.4, 20),
    y: -A(S(t, 0.4)) * 10,
    hr: 4 * S(t, 0.1),
    aL: 20,
    aR: 20,
  })),
  stomp: d("이동", "쿵쿵 발 구르기", "rise", (t) => {
    const P = 24;
    const u = t % P;
    const idx = Math.floor(t / P) % 2;
    const lift = bump(u, 0, 5, 9, 12);
    const land = lerp(u, [10, 12, 20], [0, 1, 0]);
    return {
      lgL: idx === 0 ? lift * 32 : 0,
      lgR: idx === 1 ? -lift * 32 : 0,
      y: -lift * 14,
      ...sq(1 - 0.1 * land),
      rot: 2 * (idx ? 1 : -1) * land,
      star: idx === 0 && u > 10 && u < 22 ? burst(u, 10) : 0,
    };
  }),
  jumpingJack: d("이동", "팔벌려뛰기", "pop", (t) => {
    const u = t % 28;
    const o = lerp(u, [0, 10, 14, 24], [0, 1, 1, 0], INOUT);
    return {
      aL: 18 + 117 * o,
      aR: 18 + 117 * o,
      lgL: 24 * o,
      lgR: -24 * o,
      y: arc(u, 0, 24, 50),
    };
  }),
  hopOneFoot: d("이동", "외발 콩콩", "left", (t) => ({
    lgL: 55,
    y: -A(S(t, 0.3)) * 50,
    rot: 6 * S(t, 0.3),
    aL: 70,
    aR: 70,
  })),
  leap: d("이동", "성큼 도약", "left", (t) => {
    const u = t % 60;
    const k = lerp(u, [0, 12, 24], [1, 1.12, 1]);
    return {
      sx: k,
      sy: k,
      y: arc(u, 0, 24, 160),
      aL: lerp(u, [0, 8, 20], [18, 125, 40]),
      aR: lerp(u, [0, 8, 20], [18, 125, 40]),
      lgL: lerp(u, [0, 8, 20], [0, 30, 0]),
      lgR: lerp(u, [0, 8, 20], [0, -30, 0]),
      star: burst(u, 24),
    };
  }),

  /* ───── 감정 (24) ───── */
  joy: d("감정", "환호", "pop", (t) => ({
    aL: 128 + 12 * S(t, 0.5),
    aR: 128 + 12 * S(t, 0.5, 1),
    y: -A(S(t, 0.25)) * 70,
    rot: 4 * S(t, 0.25),
    fx: "spark",
    mouthMin: 0.5,
  })),
  jumpForJoy: d("감정", "기뻐서 폴짝폴짝", "rise", (t) => {
    const u = t % 90;
    return {
      y: arc(u, 0, 16, 180) + arc(u, 20, 16, 220) + arc(u, 40, 18, 280),
      aL: lerp(u, [0, 10, 56, 70], [18, 130, 130, 18]),
      aR: lerp(u, [0, 10, 56, 70], [18, 130, 130, 18]),
      star: burst(u, 58),
      fx: "spark",
      mouthMin: 0.5,
    };
  }),
  laugh: d("감정", "박장대소", "pop", (t) => ({
    y: -A(S(t, 1.3)) * 10,
    hy: -12,
    hr: 8 * S(t, 0.9),
    rot: 3 * S(t, 0.9),
    lid: 0.6,
    mouthMin: 0.85,
    aL: 28,
    aR: 28,
  })),
  giggle: d("감정", "키득키득", "rise", (t) => {
    const g = bump(t % 60, 0, 4, 24, 28);
    return {
      y: -A(S(t, 1.5)) * 8 * g,
      hr: 6 * S(t, 1.5) * g,
      lid: 0.5 * g,
      mouthMin: 0.4 * g,
      blush: 0.5,
      aR: 18 + 132 * g,
      front: g > 0.2,
    };
  }),
  cry: d("감정", "엉엉 울기", "drop", (t) => ({
    x: 5 * S(t, 1.2),
    y: -A(S(t, 1.1)) * 6,
    hy: 18,
    mouthMin: 0.75,
    lid: 0.3,
    aL: 148 + 8 * S(t, 1.1),
    aR: 148 + 8 * S(t, 1.1, 1),
    front: true,
  })),
  sob: d("감정", "훌쩍훌쩍", "rise", (t) => ({
    ...sq(0.96),
    hy: 10 + 14 * A(S(t, 0.14)),
    rot: 3 * S(t, 0.14),
    mouthMin: 0.5,
    lid: 0.4,
    aL: 8,
    aR: 8,
  })),
  angry: d("감정", "씩씩 화남", "pop", (t) => ({
    x: 5 * S(t, 1.9),
    aL: 95 + 8 * S(t, 1.5),
    aR: 95 + 8 * S(t, 1.5, 1),
    ...sq(0.95),
    lgL: stepL(t, 0.9, 12),
    lgR: stepR(t, 0.9, 12),
    hy: 6,
    mouthMin: 0.3,
    fx: "anger",
  })),
  furious: d("감정", "부글부글 폭발", "rise", (t) => {
    const u = t % 100;
    const k = lerp(u, [0, 88, 92, 100], [1, 1.2, 0.9, 1]);
    return {
      sx: k,
      sy: k,
      x: (2 + pos(u - 20) * 0.1) * S(t, 2.1) * (u < 90 ? 1 : 0),
      star: burst(u, 92),
      fx: "anger",
      aL: 110,
      aR: 110,
      mouthMin: 0.4,
    };
  }),
  sulk: d("감정", "삐져서 돌아섬", "left", (t) => ({
    rot: lerp(t, [0, 14], [0, -14]),
    look: lerp(t, [0, 14], [0, 40]),
    hy: 10,
    aL: 8,
    aR: 8,
    blush: 0.3,
    ...sq(0.94),
    lid: 0.3,
  })),
  shy: d("감정", "부끄러움", "rise", (t) => ({
    blush: 1,
    aL: -12,
    aR: -12,
    hr: 10 * S(t, 0.15),
    lookY: 20,
    look: -20,
    ...sq(0.97),
    x: 12 * S(t, 0.1),
    lid: 0.2,
  })),
  love: d("감정", "사랑에 빠짐", "pop", (t) => ({
    fx: "heart",
    blush: 1,
    hr: 10 * S(t, 0.12),
    rot: 5 * S(t, 0.12),
    y: -A(S(t, 0.12)) * 12,
    aL: -8,
    aR: -8,
    lid: 0.35,
  })),
  surprised: d("감정", "깜짝 놀람", "pop", (t) => {
    const u = t % 110;
    return {
      y: arc(u, 0, 10, 60),
      sy: lerp(u, [0, 6, 20], [1.12, 1.12, 1]),
      aL: lerp(u, [0, 6, 30, 40], [18, 130, 130, 18]),
      aR: lerp(u, [0, 6, 30, 40], [18, 130, 130, 18]),
      mouthMin: lerp(u, [0, 4, 36, 44], [0, 1, 1, 0]),
      fx: u < 44 ? "ex" : undefined,
      star: burst(u, 10),
    };
  }),
  shocked: d("감정", "충격으로 얼어붙음", "drop", (t) => ({
    ...sq(0.92),
    x: 2 * S(t, 2.5),
    mouthMin: 0.9,
    aL: 30,
    aR: 30,
    fx: "ex",
    sweat: 1,
    star: burst(t, 0),
  })),
  scared: d("감정", "겁먹어 덜덜", "rise", (t) => ({
    x: 8 * S(t, 2.2),
    rot: 4 * S(t, 2.7),
    lgL: 6 * S(t, 2.2),
    lgR: -6 * S(t, 2.2, 1),
    aL: 135,
    aR: 135,
    ...sq(0.9),
    sweat: 1,
    mouthMin: 0.4,
    look: 22 * S(t, 0.4),
  })),
  worry: d("감정", "걱정스레 서성임", "left", (t) => ({
    x: 120 * S(t, 0.07),
    hr: 8 * S(t, 0.07, 1.2),
    sweat: 1,
    lgL: stepL(t, 0.35, 10),
    lgR: stepR(t, 0.35, 10),
    aL: 25 + 10 * S(t, 0.8),
    aR: 25 + 10 * S(t, 0.8, 1),
    hy: 6,
    look: 20 * S(t, 0.14),
  })),
  confused: d("감정", "갸우뚱 혼란", "rise", (t) => ({
    hr: 14 * S(t, 0.17),
    look: 30 * S(t, 0.17, 0.8),
    lookY: -10,
    fx: "q",
    rot: 3 * S(t, 0.17, 1),
    aL: 60,
    aR: 60,
  })),
  thinking: d("감정", "턱 괴고 생각", "drop", (t) => ({
    aR: lerp(t, [0, 10], [18, 150]),
    front: true,
    hr: -10,
    lookY: -14,
    look: 20,
    fx: t > 14 ? "q" : undefined,
    y: -A(S(t, 0.1)) * 3,
  })),
  eureka: d("감정", "아하! 깨달음", "rise", (t) => {
    const u = t % 100;
    return {
      y: arc(u, 6, 12, 90),
      aR: lerp(u, [0, 8, 30, 40], [18, 132, 132, 18]),
      fx: u > 4 && u < 70 ? "spark" : undefined,
      star: burst(u, 18),
      mouthMin: bump(u, 4, 8, 20, 28) * 0.6,
    };
  }),
  proud: d("감정", "뿌듯 어깨 으쓱", "pop", (t) => ({
    sy: 1.05,
    hy: -10,
    hr: -5,
    aL: 40 + 6 * S(t, 0.12),
    aR: 40 + 6 * S(t, 0.12, 1),
    lookY: -12,
    y: -A(S(t, 0.12)) * 5,
    blush: 0.3,
  })),
  smug: d("감정", "의기양양 흥", "right", (t) => ({
    hr: 8,
    look: 36,
    rot: -4 + 2 * S(t, 0.1),
    aL: 30,
    aR: 30,
    sy: 1.02,
  })),
  embarrassed: d("감정", "민망해서 시선 피함", "rise", (t) => ({
    sweat: 1,
    blush: 0.8,
    hy: 8,
    look: 30 * S(t, 0.2),
    aL: 20,
    aR: 20,
    x: 10 * S(t, 0.17),
    rot: 3 * S(t, 0.17),
  })),
  excited: d("감정", "두근두근 설렘", "pop", (t) => ({
    y: -A(S(t, 0.55)) * 22,
    aL: 100 + 40 * S(t, 0.9),
    aR: 100 + 40 * S(t, 0.9, 1),
    fx: "spark",
    mouthMin: 0.5,
    hr: 4 * S(t, 0.55),
  })),
  disappointed: d("감정", "실망해서 축 처짐", "drop", (t) => ({
    ...sq(lerp(t, [0, 20], [1, 0.88])),
    hy: lerp(t, [0, 20], [0, 22]),
    aL: 0,
    aR: 0,
    lookY: lerp(t, [0, 20], [0, 25]),
    lid: 0.3,
    rot: 2 * S(t, 0.08),
  })),
  relief: d("감정", "휴~ 안도", "rise", (t) => {
    const u = t % 120;
    return {
      sy: lerp(u, [0, 30, 44, 100], [1, 1.08, 0.9, 1]),
      aL: lerp(u, [0, 30, 44, 100], [18, 60, 10, 18]),
      aR: lerp(u, [0, 30, 44, 100], [18, 60, 10, 18]),
      sweat: u < 80 ? 1 : 0,
      lid: lerp(u, [30, 44, 90], [0, 0.6, 0]),
      mouthMin: lerp(u, [30, 40, 70], [0, 0.5, 0]),
    };
  }),

  /* ───── 일상 (20) ───── */
  yawn: d("일상", "하품", "rise", (t) => {
    const u = t % 120;
    const p = bump(u, 10, 30, 60, 76);
    return {
      mouthMin: p,
      lid: p * 0.9,
      aR: lerp(u, [8, 24, 64, 80], [18, 148, 148, 18]),
      front: u > 12 && u < 76,
      hy: -10 * p,
      sy: 1 + 0.06 * p,
    };
  }),
  stretch: d("일상", "기지개", "rise", (t) => {
    const u = t % 100;
    const p = bump(u, 0, 22, 60, 80);
    return {
      aL: 18 + 122 * p,
      aR: 18 + 122 * p,
      sy: 1 + 0.14 * p,
      sx: 1 - 0.05 * p,
      hy: -8 * p,
      lid: 0.8 * p,
      mouthMin: 0.5 * p,
    };
  }),
  sleepy: d("일상", "꾸벅꾸벅 졸기", "rise", (t) => {
    const u = t % 80;
    const droop = u < 50 ? 28 * (u / 50) * (u / 50) : lerp(u, [50, 58], [28, 0]);
    return {
      hy: droop,
      lid: lerp(u, [0, 50, 58, 70], [0.4, 0.95, 0.3, 0.4]),
      fx: "zzz",
      aL: 10,
      aR: 10,
      ...sq(0.97),
    };
  }),
  sleep: d("일상", "쿨쿨 잠자기", "drop", (t) => ({
    rot: lerp(t, [0, 20], [0, 14]),
    lid: 1,
    sy: 1 + 0.03 * S(t, 0.1),
    fx: "zzz",
    mouthMin: 0.2 + 0.15 * S(t, 0.1),
    aL: 5,
    aR: 5,
    hy: 14,
  })),
  wakeUp: d("일상", "화들짝 기상", "rise", (t) => {
    const u = t % 120;
    return {
      lid: lerp(u, [0, 30, 36], [1, 1, 0]),
      rot: lerp(u, [0, 30, 38], [10, 10, 0]),
      y: arc(u, 36, 10, 80),
      star: burst(u, 46),
      fx: u > 36 && u < 70 ? "ex" : u < 30 ? "zzz" : undefined,
      aL: lerp(u, [34, 42, 70], [18, 130, 18]),
      aR: lerp(u, [34, 42, 70], [18, 130, 18]),
      mouthMin: bump(u, 36, 40, 56, 64),
    };
  }),
  sneeze: d("일상", "에취 재채기", "rise", (t) => {
    const u = t % 100;
    return {
      rot: lerp(u, [0, 18, 22, 30, 50], [0, -10, 12, 0, 0]),
      mouthMin: lerp(u, [0, 18, 22, 34], [0, 0.3, 1, 0]),
      lid: lerp(u, [10, 18, 40], [0, 1, 0]),
      aR: lerp(u, [10, 20, 50], [18, 148, 18]),
      front: u > 12 && u < 50,
      x: u > 22 && u < 40 ? 8 * S(t, 2) : 0,
      star: burst(u, 22),
      fx: u > 22 && u < 50 ? "spark" : undefined,
    };
  }),
  cough: d("일상", "콜록콜록", "rise", (t) => {
    const u = t % 90;
    const j = bump(u, 0, 3, 6, 9) + bump(u, 12, 15, 18, 21);
    return {
      y: -j * 10,
      hy: j * 14,
      rot: -3 * j,
      aR: lerp(u, [0, 6, 26, 36], [18, 148, 148, 18]),
      front: u < 36,
      mouthMin: 0.6 * j,
    };
  }),
  drink: d("일상", "꿀꺽 마시기", "left", (t) => {
    const u = t % 100;
    return {
      aR: lerp(u, [0, 14, 60, 74], [18, 150, 150, 18]),
      front: u > 4 && u < 70,
      hr: -10 * bump(u, 10, 24, 56, 70),
      hy: -10 * bump(u, 10, 24, 56, 70),
      lid: 0.4 * bump(u, 14, 24, 56, 66),
      y: -A(S(t, 0.4)) * 3,
    };
  }),
  eat: d("일상", "냠냠 먹기", "left", (t) => ({
    aR: 148 + 4 * S(t, 0.5),
    front: true,
    mouthMin: 0.3 + 0.3 * A(S(t, 0.5)),
    blush: 0.4,
    hr: 4 * S(t, 0.5),
    y: -A(S(t, 0.5)) * 4,
  })),
  brushTeeth: d("일상", "양치질", "rise", (t) => ({
    aR: 150 + 8 * S(t, 1.6),
    front: true,
    mouthMin: 0.35,
    hr: 3 * S(t, 0.8),
    lid: 0.3,
    x: 4 * S(t, 1.6),
  })),
  washFace: d("일상", "세수하기", "pop", (t) => ({
    aL: 140 + 10 * S(t, 0.8),
    aR: 140 + 10 * S(t, 0.8, 1.5),
    front: true,
    lid: 0.8,
    rot: 3 * S(t, 0.4),
    fx: "spark",
    ...sq(0.98),
  })),
  applyCream: d("일상", "크림 바르기", "left", (t) => ({
    aR: 145 + 12 * S(t, 0.3),
    front: true,
    hr: 5,
    blush: 0.3,
    fx: "spark",
    lid: 0.3,
    aL: 18,
  })),
  patFace: d("일상", "토닥토닥 얼굴 두드리기", "rise", (t) => ({
    aL: 150 - 14 * A(S(t, 0.8)),
    aR: 150 - 14 * A(S(t, 0.8)),
    front: true,
    blush: 1,
    lid: 0.5,
    mouthMin: 0.2,
    hy: 6,
  })),
  mirror: d("일상", "거울 보며 매만짐", "left", (t) => ({
    look: 40 * S(t, 0.13),
    hr: 9 * S(t, 0.13),
    aR: 140 + 6 * S(t, 0.3),
    front: true,
    fx: "spark",
    blush: 0.3,
    x: 6 * S(t, 0.13),
  })),
  spreadSunscreen: d("일상", "선크림 펴 바르기", "pop", (t) => ({
    aL: 70 + 30 * S(t, 0.25),
    aR: 70 + 30 * S(t, 0.25, Math.PI),
    hr: 4 * S(t, 0.25),
    fx: "spark",
    y: -A(S(t, 0.25)) * 6,
  })),
  wipe: d("일상", "슥슥 닦기", "right", (t) => ({
    aR: 95 + 22 * S(t, 0.9),
    rot: 4 * S(t, 0.9),
    hr: 4 * S(t, 0.9),
    sweat: 1,
  })),
  scratchHead: d("일상", "머리 긁적긁적", "rise", (t) => ({
    aR: 150 + 6 * S(t, 1.9),
    front: true,
    hr: 8 * S(t, 0.2),
    look: 14 * S(t, 0.2),
    sweat: 1,
    blush: 0.4,
  })),
  checkWatch: d("일상", "시계 확인", "left", (t) => {
    const u = t % 90;
    const g = bump(u, 8, 16, 56, 68);
    return {
      aL: lerp(u, [0, 12, 60, 72], [18, 105, 105, 18]),
      lookY: 22 * g,
      look: -30 * g,
      hy: 8 * g,
      hr: 6 * g,
    };
  }),
  pointForward: d("일상", "쿡쿡 가리키기", "left", (t) => {
    const u = t % 40;
    return {
      aR: lerp(u, [0, 6, 12, 40], [80, 105, 105, 80]),
      x: 30 * bump(u, 0, 6, 12, 22),
      rot: 5 * bump(u, 0, 6, 12, 22),
      mouthMin: 0.2,
    };
  }),
  present: d("일상", "보여주듯 펼침", "pop", (t) => ({
    aL: lerp(t, [0, 10], [18, 95]) + 8 * S(t, 0.15),
    aR: lerp(t, [0, 10], [18, 95]) + 8 * S(t, 0.15, 1),
    y: -4 * S(t, 0.12),
    hr: 4 * S(t, 0.12),
    fx: "spark",
  })),

  /* ───── 운동·춤 (25) ───── */
  stepDance: d("운동·춤", "스텝 댄스", "left", (t) => ({
    x: 90 * S(t, 0.18),
    rot: 8 * S(t, 0.18),
    lgL: stepL(t, 0.36, 28),
    lgR: stepR(t, 0.36, 28),
    aL: 40 + 30 * S(t, 0.36),
    aR: 40 - 30 * S(t, 0.36),
    y: -A(S(t, 0.36)) * 28,
    fx: "note",
  })),
  disco: d("운동·춤", "디스코", "pop", (t) => {
    const s = S(t, 0.13);
    return {
      aR: 76 + 60 * s,
      aL: 76 - 60 * s,
      rot: 7 * s,
      lgL: 14 * pos(s),
      lgR: -14 * pos(-s),
      y: -A(S(t, 0.26)) * 18,
      fx: "note",
    };
  }),
  twist: d("운동·춤", "트위스트", "left", (t) => ({
    rot: 14 * S(t, 0.45),
    sx: 1 + 0.05 * S(t, 0.9),
    aL: 70 + 25 * S(t, 0.45),
    aR: 70 + 25 * S(t, 0.45),
    hr: -10 * S(t, 0.45),
    lgL: 10 * S(t, 0.45),
    lgR: 10 * S(t, 0.45),
    y: -A(S(t, 0.45)) * 8,
  })),
  wiggle: d("운동·춤", "좌우 흔들흔들", "pop", (t) => ({
    sx: 1 + 0.12 * S(t, 0.7),
    sy: 1 - 0.06 * S(t, 0.7, Math.PI / 2),
    x: 18 * S(t, 0.35),
    aL: 30 + 10 * S(t, 0.7),
    aR: 30 + 10 * S(t, 0.7, 1),
    fx: "note",
  })),
  spin: d("운동·춤", "빙글빙글 팽이", "pop", (t) => ({
    rot: t * 14,
    y: -30,
    aL: 90,
    aR: 90,
    mouthMin: 0.3,
  })),
  backflip: d("운동·춤", "뒤공중제비", "rise", (t) => {
    const u = t % 70;
    return {
      rot: lerp(u, [10, 34], [0, -360], INOUT),
      y: arc(u, 10, 24, 260),
      star: burst(u, 34),
      aL: lerp(u, [10, 18, 30], [18, 135, 18]),
      aR: lerp(u, [10, 18, 30], [18, 135, 18]),
      sy: u > 34 ? lerp(u, [34, 37, 45], [0.8, 0.8, 1]) : 1,
    };
  }),
  cartwheel: d("운동·춤", "옆으로 재주넘기", "rise", (t) => {
    const u = t % 80;
    const go = u < 45;
    return {
      x: go ? lerp(u, [8, 40], [-230, 230], INOUT) : lerp(u, [50, 75], [230, -230], INOUT),
      rot: go ? lerp(u, [8, 40], [0, 360], INOUT) : 0,
      y: arc(u, 8, 32, 120),
      aL: 90,
      aR: 90,
    };
  }),
  squat: d("운동·춤", "스쿼트", "left", (t) => {
    const p = bump(t % 60, 0, 16, 30, 46);
    return {
      sy: 1 - 0.3 * p,
      sx: 1 + 0.2 * p,
      lgL: 22 * p,
      lgR: -22 * p,
      aL: 18 + 72 * p,
      aR: 18 + 72 * p,
      hy: 6 * p,
    };
  }),
  lunge: d("운동·춤", "런지", "right", (t) => {
    const p = bump(t % 90, 0, 14, 44, 58);
    return {
      x: -110 * p,
      lgL: 35 * p,
      lgR: -10 * p,
      sy: 1 - 0.1 * p,
      aL: 18 + 70 * p,
      aR: 18 + 70 * p,
      rot: -6 * p,
    };
  }),
  sitDown: d("운동·춤", "털썩 앉기", "drop", (t) => ({
    ...sq(lerp(t, [0, 12], [1, 0.7])),
    lgL: 40,
    lgR: -40,
    aL: 20,
    aR: 20,
    hy: 4 * S(t, 0.1),
  })),
  jog: d("운동·춤", "가벼운 조깅", "left", (t) => ({
    lgL: stepL(t, 0.6, 30),
    lgR: stepR(t, 0.6, 30),
    aL: 60 + 30 * S(t, 0.6),
    aR: 60 - 30 * S(t, 0.6),
    y: -A(S(t, 0.6)) * 14,
    x: 80 * S(t, 0.05),
    rot: 3,
  })),
  boxing: d("운동·춤", "복싱 잽", "right", (t) => {
    const u = t % 32;
    return {
      aL: lerp(u, [0, 4, 10], [30, 95, 30]),
      aR: lerp(u, [16, 20, 26], [30, 95, 30]),
      x: 20 * (bump(u, 0, 4, 8, 12) - bump(u, 16, 20, 24, 28)),
      rot: 5 * (bump(u, 0, 4, 8, 12) - bump(u, 16, 20, 24, 28)),
      lgL: stepL(t, 0.4, 8),
      lgR: stepR(t, 0.4, 8),
      y: -A(S(t, 0.4)) * 6,
    };
  }),
  karateKick: d("운동·춤", "가라테 발차기", "pop", (t) => {
    const u = t % 60;
    return {
      lgL: lerp(u, [8, 16, 28, 36], [0, 75, 75, 0]),
      aL: lerp(u, [8, 16, 28, 36], [18, 95, 95, 18]),
      aR: lerp(u, [8, 16, 28, 36], [18, 95, 95, 18]),
      rot: -6 * bump(u, 8, 16, 28, 36),
      y: arc(u, 8, 24, 30),
      star: burst(u, 16),
    };
  }),
  kick: d("운동·춤", "뻥 걷어차기", "left", (t) => {
    const u = t % 50;
    return {
      lgR: lerp(u, [6, 16, 24, 34], [0, -85, -60, 0]),
      rot: 6 * bump(u, 6, 16, 24, 34),
      aL: lerp(u, [6, 16, 34], [18, 70, 18]),
      aR: lerp(u, [6, 16, 34], [18, 20, 18]),
      star: burst(u, 16),
    };
  }),
  yoga: d("운동·춤", "요가 나무 자세", "rise", (t) => ({
    lgL: lerp(t, [0, 16], [0, 60]),
    aL: lerp(t, [0, 16], [18, 135]),
    aR: lerp(t, [0, 16], [18, 135]),
    lid: 0.8,
    rot: 2 * S(t, 0.1),
    y: -A(S(t, 0.07)) * 4,
  })),
  balance: d("운동·춤", "아슬아슬 균형", "left", (t) => ({
    aL: 85,
    aR: 85,
    rot: 8 * S(t, 0.2) + 3 * S(t, 0.53),
    lgL: lerp(t, [0, 12], [0, 40]),
    sweat: 1,
    hy: 4,
    look: 12 * S(t, 0.2),
  })),
  flex: d("운동·춤", "힘자랑", "pop", (t) => ({
    aL: 100 + 15 * S(t, 0.4),
    aR: 100 + 15 * S(t, 0.4),
    sx: 1.08,
    sy: 1.04,
    fx: "spark",
    hr: -6,
    mouthMin: 0.2,
  })),
  cheerlead: d("운동·춤", "응원 율동", "pop", (t) => ({
    aL: 125 + 25 * S(t, 0.5),
    aR: 125 + 25 * S(t, 0.5, Math.PI),
    y: -A(S(t, 0.25)) * 70,
    lgL: 14 * pos(S(t, 0.25)),
    lgR: -14 * pos(-S(t, 0.25)),
    fx: "spark",
    rot: 4 * S(t, 0.25),
    mouthMin: 0.5,
  })),
  victory: d("운동·춤", "승리 포즈", "rise", (t) => {
    const u = t % 100;
    const landed = u > 22 ? 1 : 0;
    return {
      y: arc(u, 0, 20, 200),
      aL: 128 + 8 * S(t, 0.4),
      aR: 128 + 8 * S(t, 0.4, 1),
      star: burst(u, 20),
      fx: "spark",
      lgL: 20 * landed,
      lgR: -20 * landed,
      mouthMin: 0.5,
    };
  }),
  hula: d("운동·춤", "훌라 춤", "left", (t) => ({
    x: 110 * S(t, 0.1),
    rot: -12 * S(t, 0.1),
    aL: 70 + 30 * S(t, 0.2),
    aR: 70 + 30 * S(t, 0.2, Math.PI),
    y: -A(S(t, 0.2)) * 10,
    fx: "note",
  })),
  robot: d("운동·춤", "로봇 춤", "pop", (t) => {
    const q = Math.floor(t / 10) % 4;
    return {
      aL: [90, 18, 90, 18][q],
      aR: [18, 90, 90, 18][q],
      rot: [0, 6, 0, -6][q],
      x: [0, 40, 0, -40][q],
      lgL: [0, 15, 0, 0][q],
      lgR: [0, 0, 0, -15][q],
      look: [0, 30, 0, -30][q],
    };
  }),
  windmill: d("운동·춤", "팔 풍차 돌리기", "pop", (t) => ({
    aL: t * 22,
    aR: t * 22 + 180,
    y: -A(S(t, 0.3)) * 8,
    mouthMin: 0.3,
    fx: "spark",
  })),
  deepBreath: d("운동·춤", "심호흡", "rise", (t) => {
    const u = t % 140;
    const p = lerp(u, [0, 50, 70, 120], [0, 1, 1, 0], INOUT);
    return {
      aL: 18 + 112 * p,
      aR: 18 + 112 * p,
      sy: 1 + 0.08 * p,
      lid: 0.9 * p,
      hy: -6 * p,
    };
  }),
  meditate: d("운동·춤", "명상", "rise", (t) => ({
    y: -40 + 6 * S(t, 0.07),
    lid: 1,
    aL: 45,
    aR: 45,
    sy: 1 + 0.02 * S(t, 0.07),
    lgL: -25,
    lgR: 25,
    fx: "spark",
  })),

  /* ───── 연출 (5) ───── */
  floatUp: d("연출", "둥실둥실 떠다님", "rise", (t) => ({
    y: -110 + 14 * S(t, 0.08),
    rot: 4 * S(t, 0.06),
    aL: 60 + 8 * S(t, 0.08),
    aR: 60 + 8 * S(t, 0.08, 1),
    lgL: 6 * S(t, 0.1),
    lgR: -6 * S(t, 0.1),
    lid: 0.3,
  })),
  teleport: d("연출", "순간이동", "pop", (t) => {
    const u = t % 90;
    const c = Math.floor(t / 90);
    const xa = c % 2 === 0 ? 0 : 250;
    const xb = c % 2 === 0 ? 250 : 0;
    return {
      x: u < 40 ? xa : xb,
      sx: lerp(u, [30, 40, 46, 56], [1, 0.02, 0.02, 1]),
      sy: lerp(u, [30, 40, 46, 56], [1, 2.2, 2.2, 1]),
      star: burst(u, 46),
      fx: u > 44 && u < 70 ? "spark" : undefined,
    };
  }),
  melt: d("연출", "녹아내림", "rise", (t) => {
    const u = t % 140;
    const sy = lerp(u, [0, 80, 100, 120], [1, 0.45, 0.45, 1]);
    return { sy, sx: 1 + (1 - sy) * 0.9, sweat: 1, lid: 0.4, mouthMin: 0.3 };
  }),
  inflate: d("연출", "풍선처럼 부풀기", "rise", (t) => {
    const u = t % 110;
    const k = lerp(u, [0, 70, 76, 84, 100], [1, 1.35, 1.35, 0.9, 1]);
    return {
      sx: k,
      sy: k,
      mouthMin: lerp(u, [0, 70, 76], [0, 0.8, 0]),
      aL: lerp(u, [0, 70, 80], [18, 95, 18]),
      aR: lerp(u, [0, 70, 80], [18, 95, 18]),
      star: burst(u, 76),
      lid: 0.3,
    };
  }),
  dizzy: d("연출", "어질어질", "left", (t) => ({
    rot: 10 * S(t, 0.3),
    x: 30 * S(t, 0.15),
    look: 30 * S(t, 0.6),
    lookY: 14 * S(t, 0.6, Math.PI / 2),
    hr: 8 * S(t, 0.3, 1),
    fx: "dizzy",
    lgL: 8 * S(t, 0.3),
    lgR: 8 * S(t, 0.3, 2),
    aL: 40 + 10 * S(t, 0.3),
    aR: 40 + 10 * S(t, 0.3, 1),
    mouthMin: 0.2,
  })),
  faint: d("연출", "기절해서 쓰러짐", "drop", (t) => {
    const u = t % 150;
    return {
      rot: lerp(u, [10, 30, 110, 130], [0, 88, 88, 0], OUT),
      y: lerp(u, [10, 30, 110, 130], [0, 40, 40, 0]),
      x: lerp(u, [10, 30, 110, 130], [0, 200, 200, 0]),
      lid: lerp(u, [6, 14, 118, 128], [0, 1, 1, 0]),
      star: burst(u, 30),
      sweat: u < 14 ? 1 : 0,
      mouthMin: u > 30 && u < 110 ? 0.2 : 0,
    };
  }),
} satisfies Record<string, MotionInfo>;

export type MotionName = keyof typeof MOTIONS;
export const MOTION_NAMES = Object.keys(MOTIONS) as MotionName[];
export const isMotion = (n: string): n is MotionName => n in MOTIONS;
