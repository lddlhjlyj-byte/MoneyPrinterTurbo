import { AbsoluteFill } from "remotion";
import { CharacterStill } from "./Character";

const FONT =
  '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

// 프로필 800x800 (원형으로 잘리므로 얼굴을 중앙에)
export const Profile: React.FC = () => (
  <AbsoluteFill style={{ background: "#EAF7FF", fontFamily: FONT, overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: 400 - 280 * 1.2,
        top: 372 - 246 * 1.2,
        scale: 1.2,
        transformOrigin: "0 0",
      }}
    >
      <CharacterStill mouth={0.3} />
    </div>
  </AbsoluteFill>
);

// 배너 2560x1440: 모든 기기에서 보이는 안전 영역(가운데 1235x338) 안에 핵심 요소 배치
export const Banner: React.FC = () => (
  <AbsoluteFill style={{ background: "#FFFFFF", fontFamily: FONT, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: -260, top: 180, width: 900, height: 900, borderRadius: 450, background: "#FFF1A8", opacity: 0.7 }} />
    <div style={{ position: "absolute", right: -320, top: 520, width: 1000, height: 1000, borderRadius: 500, background: "#EAF7FF" }} />
    <div
      style={{
        position: "absolute",
        left: 662,
        top: 551,
        width: 1235,
        height: 338,
        display: "flex",
        alignItems: "center",
        gap: 44,
      }}
    >
      <div style={{ width: 300, height: 300, position: "relative", flex: "none" }}>
        <div style={{ position: "absolute", left: 0, top: 0, scale: 0.5, transformOrigin: "0 0" }}>
          <CharacterStill mouth={0.3} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 112, fontWeight: 900, color: "#111", lineHeight: 1.1 }}>
          노랑이 스킨랩
        </div>
        <div style={{ fontSize: 50, fontWeight: 600, color: "#666" }}>
          스킨케어 순서, 1분에 하나씩
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

// 쇼츠 썸네일 1080x1920: cards.json의 후킹 장면 문구를 그대로 사용 (영상마다 자동 변경)
import cardsData from "./cards.json";

type HookScene = { type: string; line1?: string; line2?: string; warn?: string };
const hook = ((cardsData as { scenes: HookScene[] }).scenes.find((s) => s.type === "hook") ??
  {}) as HookScene;

export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: "#FFFFFF", fontFamily: FONT, overflow: "hidden", textAlign: "center" }}>
    <div style={{ position: "absolute", left: -300, top: 900, width: 1000, height: 1000, borderRadius: 500, background: "#FFF1A8", opacity: 0.8 }} />
    <div style={{ position: "absolute", right: -360, top: 1100, width: 900, height: 900, borderRadius: 450, background: "#EAF7FF" }} />
    <div style={{ position: "absolute", top: 170, left: 0, right: 0, fontSize: Math.min(150, 1000 / ((hook.line1 ?? "").length * 0.9 || 1)), fontWeight: 900, color: "#111", lineHeight: 1.15, whiteSpace: "nowrap" }}>
      {hook.line1}
    </div>
    <div style={{ position: "absolute", top: 360, left: 0, right: 0, fontSize: Math.min(112, 1000 / ((hook.line2 ?? "").length * 0.85 || 1)), fontWeight: 900, color: "#111", lineHeight: 1.15, whiteSpace: "nowrap" }}>
      {hook.line2}
    </div>
    <div style={{ position: "absolute", top: 580, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#111", color: "#fff", fontSize: 64, fontWeight: 800, padding: "24px 52px", borderRadius: 28 }}>
        {hook.warn}
      </div>
    </div>
    <div style={{ position: "absolute", left: 540 - 280 * 1.7, top: 1180 - 246 * 1.7, scale: 1.7, transformOrigin: "0 0" }}>
      <CharacterStill mouth={0.5} />
    </div>
  </AbsoluteFill>
);
