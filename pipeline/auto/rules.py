"""cards.json 규칙 검사. 사람이 하던 글자 수 한도·금지어·구조 점검을 코드로 고정한다."""
import json
import re
from pathlib import Path

CFG = json.loads((Path(__file__).parent / "config.json").read_text("utf-8"))
ICONS = {"faucet", "cream", "bottle", "humidifier", "patch", "heater"}
SIGN_ICONS = {"wrinkle", "flake", "tight"}


def _walk_strings(x):
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for v in x.values():
            yield from _walk_strings(v)
    elif isinstance(x, list):
        for v in x:
            yield from _walk_strings(v)


def validate(d: dict) -> list:
    e = []

    def over(label, s, mx):
        if not isinstance(s, str) or not s.strip():
            e.append(f"{label}: 비어 있음")
        elif len(s) > mx:
            e.append(f"{label}: {len(s)}자 (한도 {mx}자) '{s}'")

    name = d.get("name", "")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name or "") or len(name) > 40:
        e.append("name: 영문 소문자·숫자·하이픈만, 40자 이하")
    over("title", d.get("title"), 40)
    tags = d.get("hashtags")
    if not isinstance(tags, list) or not 5 <= len(tags) <= 10 or not all(isinstance(t, str) and t.startswith("#") for t in tags):
        e.append("hashtags: '#'로 시작하는 태그 5~10개")

    sc = d.get("scenes")
    if not isinstance(sc, list) or len(sc) < 6:
        return e + ["scenes: 6개 이상 필요"]
    types = [s.get("type") for s in sc]
    if types[0] != "hook":
        e.append("첫 장면은 hook")
    if types[-1] != "outro":
        e.append("마지막 장면은 outro")
    for t in ("hook", "title", "summary", "outro"):
        if types.count(t) != 1:
            e.append(f"{t} 장면은 정확히 1개")
    if types.count("signs") > 1:
        e.append("signs는 최대 1개")
    items = [s for s in sc if s.get("type") == "item"]
    if not 3 <= len(items) <= 4:
        e.append(f"item은 3~4개 (현재 {len(items)}개)")
    if [i.get("n") for i in items] != list(range(1, len(items) + 1)):
        e.append("item의 n은 1부터 순서대로")
    if "title" in types and "summary" in types:
        if not types.index("title") < min([types.index("item")] if items else [99]) or types.index("summary") < types.index("title"):
            e.append("순서: hook → (signs) → title → item들 → summary → outro")

    total = 0
    for i, s in enumerate(sc):
        t = s.get("type")
        L = f"{t}{s.get('n', '')}"
        v = s.get("voice")
        over(f"{L}.voice", v, 120)
        total += len(v) if isinstance(v, str) else 0
        if t == "hook":
            over("hook.line1", s.get("line1"), 8)
            over("hook.line2", s.get("line2"), 11)
            over("hook.warn", s.get("warn"), 11)
            if isinstance(v, str) and len(v) > 45:
                e.append(f"hook.voice: {len(v)}자 (후킹은 한 문장, 45자 이하)")
        elif t == "signs":
            over("signs.head", s.get("head"), 9)
            over("signs.sub", s.get("sub"), 15)
            rows = s.get("rows") or []
            if len(rows) != 3:
                e.append("signs.rows는 3개")
            for r in rows:
                over("signs.row", r, 10)
            ic = s.get("icons") or []
            if len(ic) != 3 or not set(ic) <= SIGN_ICONS:
                e.append(f"signs.icons는 {sorted(SIGN_ICONS)} 중 3개")
        elif t == "title":
            over("title.text", s.get("text"), 10)
            over("title.num", s.get("num"), 4)
            if isinstance(s.get("text"), str) and isinstance(s.get("num"), str) and s["num"] in s["text"]:
                e.append("title: text 안에 num이 또 들어 있어 화면에 두 번 나옴")
            if items and isinstance(s.get("num"), str) and not s["num"].startswith(str(len(items))):
                e.append(f"title.num은 item 개수({len(items)})로 시작")
        elif t == "item":
            over(f"{L}.head", s.get("head"), 8)
            over(f"{L}.sub", s.get("sub"), 14)
            tg = s.get("tags") or []
            if len(tg) != 2:
                e.append(f"{L}.tags는 2개")
            for x in tg:
                over(f"{L}.tag", x, 6)
            if s.get("icon") is not None and s["icon"] not in ICONS:
                e.append(f"{L}.icon은 {sorted(ICONS)} 중 하나이거나 생략")
        elif t == "summary":
            over("summary.title", s.get("title"), 9)
            rows = s.get("rows") or []
            if items and len(rows) != len(items):
                e.append(f"summary.rows는 item 개수({len(items)})와 같아야 함")
            for r in rows:
                over("summary.row", r, 9)
        elif t == "outro":
            lines = (s.get("text") or "").split("\n")
            if not 1 <= len(lines) <= 2:
                e.append("outro.text는 1~2줄")
            for ln in lines:
                over("outro.text줄", ln, 8)
            if "팔로우" not in (s.get("sub") or ""):
                e.append("outro.sub에 '팔로우' 유도 문구")
            if "팔로우" not in (v or ""):
                e.append("outro.voice에 '저장하고 팔로우하세요' 유도")
            if not s.get("note"):
                e.append("outro.note(면책 문구) 필요")
        else:
            e.append(f"알 수 없는 장면 type: {t}")
    if total > 560:
        e.append(f"voice 전체 {total}자 (560자 이하, 약 60초 한도)")
    heads = [i.get("head") for i in items]
    if len(set(heads)) != len(heads):
        e.append("item head가 서로 같음")
    for s in _walk_strings(d):
        for w in CFG["banned_words"]:
            if w in s:
                e.append(f"금지어 '{w}' 포함: '{s[:30]}'")
    return e


if __name__ == "__main__":
    import sys

    d = json.load(open(sys.argv[1], encoding="utf-8"))
    errs = validate(d)
    print("통과" if not errs else "\n".join(errs))
    sys.exit(1 if errs else 0)
