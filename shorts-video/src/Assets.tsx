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
