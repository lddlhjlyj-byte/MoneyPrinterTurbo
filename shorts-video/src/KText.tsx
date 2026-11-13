import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * 글자 모션(키네틱 타이포).
 *  - push : 캐릭터 손(주먹)이 글자 덩어리를 옆에서 밀어 넣는다. 다 들어오면 손은 물러난다
 *  - flick: 손가락이 글자 위를 지나가며 한 글자씩 톡톡 튕겨 올린다
 *  - pop  : 글자가 한 글자씩 통통 튀며 커진다(스프링)
 *  - drop : 글자가 위에서 떨어져 바닥에서 튕긴다
 *  - none : 기본 등장(아래에서 위로 페이드)
 */
export type TextMotion = "push" | "flick" | "pop" | "drop" | "none";

const INK = "#111111";
const BRAND = "#FFD84D";
const BRAND_LIGHT = "#FFF1A8";

// 캐릭터 팔과 같은 모양: 노란 팔 + 흰 소매 + 검은 외곽선
const Hand: React.FC<{ width: number; finger?: boolean }> = ({
  width,
  finger,
}) => (
  <svg
    width={width}
    height={(width * 110) / 175}
    viewBox="0 0 175 110"
    style={{ display: "block", overflow: "visible" }}
  >
    <rect x="0" y="22" width="26" height="66" rx="8" fill="#FFFFFF" stroke={INK} strokeWidth="5" />
    <rect x="20" y="34" width="50" height="42" fill={BRAND} stroke={INK} strokeWidth="5" />
    {finger ? (
      <rect x="112" y="28" width="58" height="26" rx="13" fill={BRAND} stroke={INK} strokeWidth="5" />
    ) : null}
    <rect x="55" y="14" width="76" height="82" rx="32" fill={BRAND} stroke={INK} strokeWidth="5" />
    <ellipse cx="82" cy="34" rx="12" ry="7" fill={BRAND_LIGHT} />
    <path d="M110 56 H128 M110 72 H126" stroke={INK} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

type Props = {
  text: string;
  mode: TextMotion;
  size: number; // 글자 크기(px)
  delay?: number; // 시작 프레임
  from?: "l" | "r"; // push 방향
  style?: React.CSSProperties; // 위치·색·굵기
};

export const KText: React.FC<Props> = ({
  text,
  mode,
  size,
  delay = 0,
  from = "l",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f0 = frame - delay;
  const lines = text.split("\n");
  const total = Array.from(text.replace(/[\s]/g, "")).length;
  const base: React.CSSProperties = {
    fontSize: size,
    lineHeight: 1.18,
    ...style,
    position: style?.position ?? "relative",
  };

  if (mode === "none") {
    const t = interpolate(f0, [0, 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    return (
      <div style={{ ...base, whiteSpace: "pre-line", opacity: t, translate: `0px ${(1 - t) * 60}px` }}>
        {text}
      </div>
    );
  }

  if (mode === "push") {
    const sign = from === "l" ? 1 : -1;
    const t = interpolate(f0, [0, 17], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.5)),
    });
    const x = -sign * (1 - t) * 1200;
    const skew = sign * -(1 - Math.min(1, t)) * 10;
    // 다 밀어 넣은 뒤(≈20프레임) 손이 빠진다
    const out = interpolate(f0, [20, 34], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.cubic),
    });
    const hw = Math.max(size * 1.55, 230);
    return (
      <div
        style={{
          ...base,
          whiteSpace: "pre-line",
          opacity: f0 < 0 ? 0 : 1,
          translate: `${x}px 0px`,
          transform: `skewX(${skew}deg)`,
        }}
      >
        {text}
        <div
          style={{
            position: "absolute",
            top: "50%",
            [from === "l" ? "right" : "left"]: "100%",
            marginTop: -(hw * 110) / 175 / 2,
            marginLeft: from === "l" ? 0 : 0,
            transform: `translateX(${-sign * (out * 900) - sign * 6}px) scaleX(${sign})`,
            transformOrigin: "center",
            opacity: 1 - out,
          }}
        >
          <Hand width={hw} />
        </div>
      </div>
    );
  }

  // 글자 단위 모션(pop / drop / flick)
  const stag = mode === "flick" ? 4 : 2;
  let idx = 0;
  return (
    <div style={base}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "block" }}>
          {line.split(" ").map((word, wi, arr) => (
            <React.Fragment key={wi}>
              <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                {Array.from(word).map((ch, ci) => {
                  const k = idx++;
                  const f = f0 - k * stag;
                  const seed = (k % 3) - 1; // -1, 0, 1
                  let opacity = f < 0 ? 0 : 1;
                  let tr = "none";
                  let hand: React.ReactNode = null;

                  if (mode === "pop") {
                    const s = spring({
                      frame: Math.max(0, f),
                      fps,
                      config: { damping: 7, stiffness: 230, mass: 0.5 },
                    });
                    tr = `translateY(${(1 - s) * size * 0.9}px) scale(${s}) rotate(${(1 - s) * seed * 18}deg)`;
                  } else if (mode === "drop") {
                    const t = interpolate(f, [0, 18], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bounce,
                    });
                    const r = interpolate(f, [0, 18], [seed * 30, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    });
                    tr = `translateY(${-(1 - t) * 900}px) rotate(${r}deg)`;
                  } else {
                    // flick: 손가락이 닿는 순간(f=2) 글자가 위로 튕겨 올라와 자리 잡는다
                    const s = spring({
                      frame: Math.max(0, f - 2),
                      fps,
                      config: { damping: 8, stiffness: 320, mass: 0.45 },
                    });
                    opacity = f < 2 ? 0 : 1;
                    tr = `translateY(${(1 - s) * size * 1.1}px) scaleY(${0.8 + 0.2 * s})`;
                    const isLast = k === total - 1;
                    const showHand = f >= -2 && f < stag + (isLast ? 8 : 1);
                    if (showHand) {
                      const hw = Math.max(size * 1.5, 180);
                      // 톡: 아래로 찍었다가 올라간다
                      const tap = Math.sin(interpolate(f, [-2, 4], [0, Math.PI], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
                      const leave = isLast ? interpolate(f, [stag, stag + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
                      hand = (
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: -hw / 2 + size * 0.1 + tap * size * 0.3 - leave * size * 1.2,
                            marginLeft: -hw / 2,
                            marginTop: -(hw * 110) / 175 / 2,
                            transform: "rotate(90deg)",
                            opacity: 1 - leave,
                            pointerEvents: "none",
                          }}
                        >
                          <Hand width={hw} finger />
                        </div>
                      );
                    }
                  }

                  return (
                    <span
                      key={ci}
                      style={{
                        display: "inline-block",
                        position: "relative",
                        opacity,
                        transform: tr,
                      }}
                    >
                      {ch}
                      {hand}
                    </span>
                  );
                })}
              </span>
              {wi < arr.length - 1 ? " " : null}
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
};
