"""cards.json에서 렌더링 결과에 영향을 주는 값(enum)의 단일 출처. rules.py·validate_cards.py·generate.py가 같이 쓴다.
글자 수·문구는 여기서 검사하지 않는다(사용자 대본 문구 유지 원칙). 값이 틀리면 화면이 조용히 기본값으로 돌아가므로 오류로 막는다."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from motion_names import motion_names  # noqa: E402

TYPES = {"hook", "why", "signs", "title", "item", "summary", "outro"}
ICONS = {"faucet", "cream", "bottle", "humidifier", "patch", "heater"}  # InfoCard.tsx ITEM_ICONS
SIGN_ICONS = {"wrinkle", "flake", "tight"}
KINDS = {"capsule", "bottle", "sun", "winter"}
MOODS = {"normal", "happy", "sad", "angry", "shine", "teary"}  # Character.tsx Mood
GESTURES = {"idle", "up", "pointR", "pointL", "count", "wave", "both", "cheer", "shy"}
DECOS = {"snow"}
BASE_MOVES = {"run", "rise", "spinJump", "tremble", "bounce", "shiver", "tilt", "sway", "hop3", "nod"}


def moves():
    return BASE_MOVES | set(motion_names())


def check_enums(d):
    """enum 값·구조만 검사해 오류 문자열 목록을 돌려준다. 문구 길이는 보지 않는다."""
    e, mv = [], moves()
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", d.get("name") or ""):
        e.append(f"name이 영문 소문자·숫자·하이픈이 아님: '{d.get('name')}'")
    sc = d.get("scenes") or []
    if not sc or sc[0].get("type") != "hook":
        e.append("첫 장면이 hook이 아님")
    if not sc or sc[-1].get("type") != "outro":
        e.append("마지막 장면이 outro가 아님")
    items = [s for s in sc if s.get("type") == "item"]
    if items and [s.get("n") for s in items] != list(range(1, len(items) + 1)):
        e.append(f"item n이 1,2,3 순서가 아님: {[s.get('n') for s in items]}")
    for i, s in enumerate(sc):
        w = f"장면{i + 1}({s.get('type')})"
        if s.get("type") not in TYPES:
            e.append(f"{w}: 알 수 없는 type")
        if not s.get("voice"):
            e.append(f"{w}: voice 없음")
        for key, ok in (("move", mv), ("gesture", GESTURES), ("mood", MOODS), ("kind", KINDS), ("deco", DECOS)):
            if s.get(key) is not None and s[key] not in ok:
                hint = " (동작 이름은 mood가 아니라 move에 넣어야 함)" if key == "mood" and s[key] in mv else ""
                e.append(f"{w}: {key} '{s[key]}' 없음{hint}")
        if s.get("type") == "item" and s.get("icon") is not None and s["icon"] not in ICONS:
            e.append(f"{w}: icon '{s['icon']}' 없음")
        if s.get("type") == "signs" and not set(s.get("icons") or []) <= SIGN_ICONS:
            e.append(f"{w}: icons는 {sorted(SIGN_ICONS)}만 가능")
    return e


if __name__ == "__main__":
    import json

    errs = check_enums(json.load(open(sys.argv[1], encoding="utf-8")))
    print("\n".join(errs) if errs else "형식 오류 없음")
    sys.exit(1 if errs else 0)
