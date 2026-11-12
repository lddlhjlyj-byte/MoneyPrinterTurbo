#!/usr/bin/env python3
"""cards.json 자동 검수 (검수자의 기계 점검 부분).
사용: python3 pipeline/validate_cards.py [cards.json 경로] [--allow-existing]
오류가 있으면 종료 코드 1. 경고는 사람이 판단한다."""
import json, re, sys, glob, os

path = next((a for a in sys.argv[1:] if not a.startswith("--")), "shorts-video/src/cards.json")
allow_existing = "--allow-existing" in sys.argv
d = json.load(open(path, encoding="utf-8"))
errors, warns = [], []
E = errors.append
W = warns.append

ICONS = {"faucet", "cream", "bottle", "humidifier", "patch"}
MOVES = {"run", "rise", "spinJump", "tremble", "bounce", "shiver", "tilt", "sway", "hop3", "nod"}
GESTURES = {"idle", "up", "pointR", "pointL", "count", "wave", "both", "cheer", "shy"}
KINDS = {"capsule", "bottle", "sun", "winter"}
SIGN_ICONS = {"wrinkle", "flake", "tight"}
TYPES = {"hook", "why", "signs", "title", "item", "summary", "outro"}
BANNED = ["무조건", "100%", "최고", "반드시", "완치", "치료", "기적", "확실히", "즉각", "영구"]
RISKY = ["재생", "개선", "회복", "효과", "미백", "주름 개선", "탄력"]  # 화장품 표시·광고 주의(사람이 판단)


def n(s):
    return len(s or "")


def lim(where, s, mx):
    if n(s) > mx:
        E(f"{where}: {n(s)}자 (한도 {mx}) '{s}'")


name = d.get("name", "")
if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
    E(f"name이 영문 소문자·숫자·하이픈이 아님: '{name}'")
elif not allow_existing and os.path.exists(f"content/videos/{name}.mp4"):
    E(f"name '{name}'은 이미 content/videos에 있음(덮어쓰기 방지: 다른 이름 사용)")
title = d.get("title", "")
if not title or n(title) > 40:
    E(f"title 없음 또는 40자 초과: '{title}'")
tags = d.get("hashtags", [])
if not (5 <= len(tags) <= 10):
    W(f"hashtags {len(tags)}개 (5~10개 권장)")

S = d.get("scenes", [])
types = [s.get("type") for s in S]
if types.count("hook") != 1 or types[0] != "hook":
    E("첫 장면이 hook 하나여야 함")
if types.count("outro") != 1 or types[-1] != "outro":
    E("마지막 장면이 outro 하나여야 함")
for t in set(types):
    if t not in TYPES:
        E(f"알 수 없는 장면 type: {t}")

voice_total = 0
items = [s for s in S if s.get("type") == "item"]
if items and [s.get("n") for s in items] != list(range(1, len(items) + 1)):
    E(f"item n이 1,2,3..순서가 아님: {[s.get('n') for s in items]}")
if items and not (3 <= len(items) <= 4):
    W(f"item {len(items)}개 (3~4개 권장)")

for i, s in enumerate(S):
    t = s.get("type")
    w = f"장면{i+1}({t})"
    v = s.get("voice", "")
    voice_total += n(v)
    if t != "title" or True:
        if not v:
            E(f"{w}: voice 없음")
    if s.get("move") and s["move"] not in MOVES:
        E(f"{w}: move '{s['move']}' 없음 (가능: {sorted(MOVES)})")
    if s.get("gesture") and s["gesture"] not in GESTURES:
        E(f"{w}: gesture '{s['gesture']}' 없음 (가능: {sorted(GESTURES)})")
    if t == "hook":
        lim(w + " line1", s.get("line1"), 8)
        lim(w + " line2", s.get("line2"), 11)
        lim(w + " warn", s.get("warn"), 12)
        if n(v) > 40:
            W(f"{w}: 후킹 음성 {n(v)}자 (4초 이내=약 25자 권장, 길면 늘어짐)")
    elif t == "why":
        lim(w + " head", s.get("head"), 9)
        lim(w + " sub", s.get("sub"), 17)
        for k in "abc":
            lim(w + f" {k}", s.get(k), 5)
        if s.get("kind") and s["kind"] not in KINDS:
            E(f"{w}: kind '{s['kind']}' 없음")
    elif t == "signs":
        lim(w + " head", s.get("head"), 9)
        lim(w + " sub", s.get("sub"), 15)
        rows, icons = s.get("rows", []), s.get("icons", [])
        if len(rows) != 3 or len(icons) != 3:
            E(f"{w}: rows·icons는 각각 3개")
        for r in rows:
            lim(w + " row", r, 10)
        for ic in icons:
            if ic not in SIGN_ICONS:
                E(f"{w}: icon '{ic}' 없음 (가능: {sorted(SIGN_ICONS)})")
    elif t == "title":
        lim(w + " text", s.get("text"), 11)
        if s.get("text") and s.get("num") and s["num"] in s["text"]:
            E(f"{w}: text에 num '{s['num']}'이 이미 들어 있어 화면에 두 번 표시됨")
        lim(w + " num", s.get("num"), 4)
    elif t == "item":
        lim(w + " head", s.get("head"), 8)
        lim(w + " sub", s.get("sub"), 14)
        tg = s.get("tags", [])
        if not (1 <= len(tg) <= 2):
            W(f"{w}: tags {len(tg)}개 (1~2개 권장)")
        for x in tg:
            lim(w + " tag", x, 6)
        ic = s.get("icon")
        if ic and ic not in ICONS:
            E(f"{w}: icon '{ic}' 없음 (가능: {sorted(ICONS)})")
        if not ic:
            W(f"{w}: icon 없음(번호만 표시됨. 내용에 맞는 그림이 있으면 지정)")
    elif t == "summary":
        lim(w + " title", s.get("title"), 10)
        rows = s.get("rows", [])
        if not (3 <= len(rows) <= 4):
            E(f"{w}: rows는 3~4개")
        for r in rows:
            lim(w + " row", r, 9)
    elif t == "outro":
        for line in (s.get("text") or "").split("\n"):
            lim(w + " text줄", line, 8)
        if "저장" not in v and "팔로우" not in v:
            W(f"{w}: voice에 저장·팔로우 유도 없음")
        if not s.get("note"):
            W(f"{w}: 면책 note 없음")
    # 금지어·주의어
    blob = " ".join(str(x) for x in [v, s.get("head"), s.get("sub"), s.get("text"), s.get("title"), s.get("line1"), s.get("line2"), s.get("warn")] + (s.get("tags") or []) + (s.get("rows") or []) if x)
    for b in BANNED:
        if b in blob:
            E(f"{w}: 금지어 '{b}'")
    for r in RISKY:
        if r in blob:
            W(f"{w}: 화장품 표시·광고 주의어 '{r}' (근거·표현 확인)")

for b in BANNED:
    if b in title or any(b in x for x in tags):
        E(f"title/hashtags 금지어 '{b}'")
for r in RISKY:
    if r in title or any(r in x for x in tags):
        W(f"title/hashtags 주의어 '{r}'")

if voice_total > 500:
    E(f"voice 합계 {voice_total}자 (500자 이하, 약 55초)")
elif voice_total > 420:
    W(f"voice 합계 {voice_total}자 (길이 주의, 60초 넘을 수 있음)")

# 같은 영상 안 move 중복, 이전 영상과 같은 item 동작 순서
mv = [s["move"] for s in S if s.get("move")]
if len(mv) != len(set(mv)):
    E(f"같은 영상 안에서 move 중복: {mv}")
if len(items) and not all(s.get("move") for s in items):
    W("item에 move 미지정(기본 동작은 영상마다 반복됨): 디자이너 단계에서 지정")
sig = [s.get("move") for s in items]
for f in glob.glob("shorts-video/src/cards.*.json"):
    try:
        o = json.load(open(f, encoding="utf-8"))
    except Exception:
        continue
    if o.get("name") == name:
        continue
    osig = [s.get("move") for s in o.get("scenes", []) if s.get("type") == "item"]
    if sig and sig == osig and any(sig):
        E(f"{os.path.basename(f)}와 item 동작 순서가 같음: {sig}")

print(f"[{name}] 장면 {len(S)}개, voice {voice_total}자")
for x in errors:
    print("오류:", x)
for x in warns:
    print("경고:", x)
if not errors:
    print("오류 없음" + (f" (경고 {len(warns)}건: 사람이 확인)" if warns else ""))
sys.exit(1 if errors else 0)
