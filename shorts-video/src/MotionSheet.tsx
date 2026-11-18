import { Sequence, useCurrentFrame } from "remotion";
import { CharacterSynthetic } from "./Character";
import { naturalize } from "./choreo";
import { MOTIONS, MOTION_NAMES, MotionName } from "./motions";

/**
 * 동작 확인용 사진판(영상 제작에는 쓰이지 않음).
 * 동작마다 지정한 프레임들의 모습을 나란히 보여준다.
 * 실행: npx remotion still MotionSheet out/sheet.png --props='{"from":0,"count":12}'
 */
const FONT =
  '"Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const D = 170;
const CELL_W = 300;
const LABEL_H = 34;
const STAGE_H = 300;

const Cell: React.FC<{ name: MotionName }> = ({ name }) => {
  const f = useCurrentFrame();
  const pose = naturalize(MOTIONS[name].fn)(f, D);
  return (
    <div
      style={{
        position: "absolute",
        left: (CELL_W - 560) / 2,
        bottom: 6,
        width: 560,
        height: 597,
        transform: "scale(0.46)",
        transformOrigin: "50% 100%",
      }}
    >
      <CharacterSynthetic
        gesture="idle"
        offset={0}
        totalFrames={D}
        pose={pose}
        mood="normal"
      />
    </div>
  );
};

export type MotionSheetProps = { from: number; count: number; frames: number[] };

export const MotionSheet: React.FC<MotionSheetProps> = ({ from, count, frames }) => {
  const names = MOTION_NAMES.slice(from, from + count);
  return (
    <div
      style={{
        width: 6 * CELL_W,
        background: "#fff",
        fontFamily: FONT,
        display: "flex",
        flexWrap: "wrap",
      }}
    >
      {names.map((name) => (
        <div
          key={name}
          style={{
            width: frames.length * CELL_W,
            flex: "none",
            display: "flex",
            flexWrap: "wrap",
            borderBottom: "1px solid #ddd",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              height: LABEL_H,
              fontSize: 21,
              fontWeight: 700,
              lineHeight: `${LABEL_H}px`,
              paddingLeft: 8,
            }}
          >
            {name} · {MOTIONS[name].label}
          </div>
          {frames.map((k) => (
            <div
              key={k}
              style={{
                width: CELL_W,
                height: STAGE_H,
                position: "relative",
                overflow: "hidden",
                borderRight: "1px solid #eee",
                boxSizing: "border-box",
              }}
            >
              <Sequence from={-k} layout="none">
                <Cell name={name} />
              </Sequence>
              <div
                style={{
                  position: "absolute",
                  right: 6,
                  top: 2,
                  fontSize: 15,
                  color: "#888",
                }}
              >
                f{k}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
