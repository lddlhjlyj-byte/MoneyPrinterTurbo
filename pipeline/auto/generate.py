#!/usr/bin/env python3
"""주제 선정 → 대본(cards.json) → 규칙 검사 → LLM 검수 → 연출 지정 → 저장. (무료: GitHub Models, 실패 시 OpenRouter 무료 모델)
환경변수: GITHUB_TOKEN(Actions가 자동 제공), OPENROUTER_API_KEY(선택), PIPELINE_ROOT(테스트용), LLM_MOCK_FILE(테스트용)"""
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import rules  # noqa: E402
from motion_names import motion_names  # noqa: E402

ROOT = Path(os.environ.get("PIPELINE_ROOT") or HERE.parents[1])
CFG = rules.CFG
CARDS = ROOT / "shorts-video/src/cards.json"
TOPICS = HERE / "topics.json" if not os.environ.get("PIPELINE_ROOT") else ROOT / "pipeline/auto/topics.json"
KST = datetime.timezone(datetime.timedelta(hours=9))


# ───────── LLM 호출 ─────────
def _post(url, headers, body, timeout=120):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            code = r.status
    except urllib.error.HTTPError as ex:
        raise RuntimeError(f"HTTP {ex.code}: {ex.read()[:200].decode('utf-8', 'replace')}") from ex
    try:
        out = json.loads(raw)["choices"][0]["message"]["content"]
        if not out:
            raise ValueError("빈 응답(content 없음)")
        return out
    except Exception as ex:  # noqa: BLE001
        raise RuntimeError(f"응답 해석 실패(상태 {code}, 길이 {len(raw)}): {raw[:200].decode('utf-8', 'replace')}") from ex


def chat(messages, temperature=0.8):
    mock = os.environ.get("LLM_MOCK_FILE")
    if mock:
        return Path(mock).read_text("utf-8") if messages[0]["content"].startswith("너는 한국어") else '{"pass": true, "issues": []}'
    errs = []
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        for m in CFG["models"]:
            try:
                return _post("https://models.github.ai/inference/chat/completions",
                             {"Authorization": f"Bearer {tok}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"},
                             {"model": m, "messages": messages, "temperature": temperature, "max_tokens": 3500})
            except Exception as ex:  # noqa: BLE001
                errs.append(f"GitHub Models {m}: {ex}")
    key = os.environ.get("OPENROUTER_API_KEY")
    if key:
        for _ in range(4):  # 무료 라우터는 가끔 빈 응답을 주므로 몇 번 더 시도
            try:
                return _post("https://openrouter.ai/api/v1/chat/completions", {"Authorization": f"Bearer {key}"},
                             {"model": CFG["openrouter_model"], "messages": messages, "temperature": temperature, "max_tokens": 3500})
            except Exception as ex:  # noqa: BLE001
                errs.append(f"OpenRouter: {ex}")
    raise RuntimeError("LLM 호출 실패: " + " | ".join(errs) if errs else "LLM 호출 불가: GITHUB_TOKEN/OPENROUTER_API_KEY 없음")


def extract_json(text):
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S) or re.search(r"(\{.*\})", text, re.S)
    if not m:
        raise ValueError("JSON을 찾지 못함")
    return json.loads(m.group(1))


def system_prompt():
    t = (ROOT / "pipeline/gpt-prompt.md").read_text("utf-8")
    block = re.search(r"```\n(.*?)\n```", t, re.S).group(1)
    return (block + '\n- 출력 JSON 최상위에 "topic"(고른 주제 원문)도 넣는다.'
            '\n- 출력 JSON 최상위에 "facts"도 넣는다: 대본에 쓴 수치·효능 주장 각각을 "주장 — 출처 이름(아는 경우) 또는 미확인" 형식의 문자열 배열로(2~6개).'
            '\n- 화장품 제품명이 "재생", "치료", "개선" 같은 효능 단어를 포함하면 쓰지 않는다.')


REVIEWER = """너는 쇼츠 검수자다. 아래 cards.json을 읽고 JSON만 출력한다: {"pass": true|false, "issues": ["..."]}.
fail 기준: ⓪문장이 한 호흡(15~22자)으로 끊기지 않았거나 2~3초 넘게 같은 말만 하는 장면이 있음 ①후킹이 눈에 보이는 장면·시청자 본인 경험 없이 추상적 ②효능 보장·과장·단정 ③대본과 화면 글자가 서로 어긋남 ④아이콘이 장면 내용과 무관 ⑤근거 없는 수치.
사소한 표현 차이는 통과시킨다. issues는 고칠 점을 구체적으로 쓴다."""


def season(m):
    return {12: "겨울", 1: "겨울", 2: "겨울", 3: "봄", 4: "봄", 5: "봄", 6: "여름", 7: "여름", 8: "여름", 9: "가을", 10: "가을", 11: "가을 끝·초겨울"}[m]


# ───────── 연출 지정 (표정·동작·제스처를 장면 내용에 맞춰, 직전 영상과 겹치지 않게) ─────────
# 기존 동작 9개 + 사람 동작 100개(shorts-video/src/motions.ts). 장면 내용에 맞는 동작을 먼저 고르고, 없으면 일반 설명용에서 고른다.
MOVES = ["run", "rise", "spinJump", "bounce", "hop3", "sway", "tilt", "nod", "shiver"]
GESTS = ["both", "pointR", "pointL", "cheer", "wave", "up", "count"]
CAUTION = ("주의", "자극", "따가", "붉", "확인", "조심", "중단")
# 주의 장면(자극·따가움 등): 놀람·걱정 계열
CAUTION_MOVES = ["tremble", "worry", "scared", "confused", "shocked", "shrug"]
# 장면 글(voice+head)에 단어가 있으면 그 내용에 맞는 동작 후보(앞쪽이 우선)
KEYWORD_MOVES = [
    (("세안", "씻", "클렌징", "거품", "헹"), ["washFace"]),
    (("선크림", "자외선", "썬", "sun"), ["spreadSunscreen", "applyCream"]),
    (("크림", "보습", "로션", "앰플", "세럼", "에센스", "바르"), ["applyCream", "patFace", "spreadSunscreen"]),
    (("토너", "흡수", "두드", "토닥", "톡톡"), ["patFace", "applyCream"]),
    (("닦", "제거", "화장솜", "문지"), ["wipe"]),
    (("물", "수분", "마시"), ["drink", "patFace"]),
    (("거울", "살펴", "체크", "점검", "피부결", "결"), ["mirror", "thinking"]),
    (("시간", "분 ", "초 ", "기다", "이내", "몇 분"), ["checkWatch"]),
    (("여기", "이곳", "부위", "턱", "볼", "이마"), ["pointForward"]),
    (("밤", "수면", "잠", "취침"), ["sleepy", "yawn"]),
    (("아침", "기상", "일어"), ["stretch", "wakeUp"]),
    (("호흡", "스트레스", "휴식", "긴장"), ["deepBreath", "meditate", "relief"]),
    (("먹", "식단", "음식"), ["eat"]),
    (("핵심", "포인트", "기억", "정리", "팁", "비결"), ["eureka", "present"]),
    (("촉촉", "윤기", "탄력", "좋아", "효과", "개선"), ["proud", "excited", "joy"]),
    (("왜", "이유", "원인", "궁금", "고민", "문제"), ["thinking", "confused"]),
    (("건조", "당김", "각질", "푸석"), ["worry", "shrug"]),
    (("겨울", "추", "찬 "), ["scared", "relief"]),
]
# 내용과 무관할 때 쓰는 일반 설명용(몸짓이 과하지 않은 것)
GENERAL_MOVES = MOVES + [
    "present", "nodYes", "thinking", "eureka", "proud", "excited", "pointForward", "smug", "hello", "applaud",
    "skip", "stepDance", "disco", "wiggle", "twist", "jumpingJack", "cheerlead", "victory", "giggle", "relief",
    "stretch", "deepBreath", "flex", "salute", "beckon", "highFive", "march", "walk", "love", "shrug",
]


def pick_move(text, k, name, used, prev_same_pos, recent, caution):
    """장면 글에 맞는 동작을 고른다. 같은 영상 안 중복·직전 영상 같은 위치·최근 영상에서 쓴 동작은 되도록 피한다."""
    valid = set(motion_names()) | set(MOVES) | {"tremble"}
    if caution:
        cands = CAUTION_MOVES
    else:
        cands = []
        for words, names in KEYWORD_MOVES:
            if any(w in text for w in words):
                cands += [n for n in names if n not in cands]
        cands += [n for n in GENERAL_MOVES if n not in cands]
    cands = [n for n in cands if n in valid]
    for relax in (0, 1, 2):
        pool = [n for n in cands if n not in used]
        if relax < 2:
            pool = [n for n in pool if n != prev_same_pos]
        if relax < 1:
            pool = [n for n in pool if n not in recent]
        if pool:
            if caution or text_match_count(text) > 0:
                return pool[0]  # 내용에 맞는 후보가 앞에 있으므로 첫 번째
            return pool[(k * 3 + len(name)) % len(pool)]
    return "nod"


def text_match_count(text):
    return sum(1 for words, _ in KEYWORD_MOVES if any(w in text for w in words))


def design(d, prev, recent=()):
    pm, pg, pmood = prev.get("moves", []), prev.get("gestures", []), prev.get("moods", {})
    recent = set(recent)
    items = [s for s in d["scenes"] if s["type"] == "item"]
    moves, gests = [], []
    for k, s in enumerate(items):
        text = s["voice"] + " " + s["head"]
        caution = any(w in text for w in CAUTION)
        mv = pick_move(text, k, d["name"], moves, pm[k] if k < len(pm) else None, recent, caution)
        gp = [g for g in GESTS if g not in gests and (k >= len(pg) or g != pg[k])]
        gs = "shy" if caution else gp[(k * 2 + len(d["name"])) % len(gp)]
        s["move"], s["gesture"] = mv, gs
        if not caution:
            s["worry"] = False
        moves.append(mv)
        gests.append(gs)
    winter = any(w in json.dumps(d, ensure_ascii=False) for w in ("겨울", "히터", "난방"))
    for s in d["scenes"]:
        if s["type"] in ("hook", "outro") and winter:
            s["deco"] = "snow"
    moods = assign_moods(d, pmood)
    return moves, gests, moods


def assign_moods(d, pmood):
    """장면 내용에 맞춰 표정 지정. why/signs=걱정(sad), 주의 문구 item=angry/sad, 일반 item=happy/shine, summary=happy, outro=shine/happy.
    같은 영상 안에서 연속 장면이 같은 표정이 되지 않게 하고, 직전 영상의 같은 위치 표정과도 겹치지 않게 한다. hook은 기본(놀람)을 유지한다."""
    moods, last = {}, None
    items = [s for s in d["scenes"] if s["type"] == "item"]
    for s in d["scenes"]:
        t = s["type"]
        key = f"item{s['n']}" if t == "item" else t
        if t == "hook":
            continue
        if t in ("why", "signs"):
            pool = ["sad", "teary"]
        elif t == "item":
            caution = any(w in s["voice"] + s["head"] for w in CAUTION)
            pool = ["angry", "sad"] if caution else ["happy", "shine"]
        elif t == "summary":
            pool = ["happy", "shine"]
        elif t == "outro":
            pool = ["shine", "happy"]
        else:
            continue
        pool = [m for m in pool if m != last and m != pmood.get(key)] or [m for m in pool if m != last] or pool
        s["mood"] = pool[0]
        moods[key] = pool[0]
        last = pool[0]
    return moods


def description(d):
    hook = next(s for s in d["scenes"] if s["type"] == "hook")
    outro = next(s for s in d["scenes"] if s["type"] == "outro")
    rows = next(s for s in d["scenes"] if s["type"] == "summary")["rows"]
    return f"{hook['voice']}\n{' / '.join(rows)}\n{outro['note']}.\n\n#Shorts " + " ".join(d["hashtags"])


def main():
    if (HERE / "PAUSE").exists():
        print("pipeline/auto/PAUSE 파일이 있어 자동 생성을 건너뜀")
        return 0
    st = json.loads(TOPICS.read_text("utf-8"))
    used_names = {u["name"] for u in st["used"]} | {p.stem for p in (ROOT / "content/videos").glob("*.mp4")}
    used_topics = [u["topic"] for u in st["used"]]
    cands = [t for t in st["backlog"] if t not in used_topics]
    if not cands:
        print("주제 후보가 없음: pipeline/auto/topics.json의 backlog를 채워야 함", file=sys.stderr)
        return 2
    today = datetime.datetime.now(KST)
    user = (f"오늘 날짜: {today:%Y-%m-%d} ({season(today.month)}). 아래 후보 중 지금 계절과 시청자 관심에 가장 맞는 주제 1개를 골라 작성하라.\n후보:\n"
            + "\n".join(f"- {t}" for t in cands[:15]) + f"\n이미 쓴 name(재사용 금지): {sorted(used_names)}")
    msgs = [{"role": "system", "content": system_prompt()}, {"role": "user", "content": user}]
    d, notes = None, []
    for attempt in range(1, CFG["max_attempts"] + 1):
        raw = chat(msgs)
        try:
            d = extract_json(raw)
        except Exception as ex:  # noqa: BLE001
            errs = [f"JSON 해석 실패: {ex}"]
        else:
            errs = rules.validate(d)
            if d.get("name") in used_names:
                errs.append(f"name '{d['name']}'이 이미 사용됨")
            if not errs:
                try:
                    rv = extract_json(chat([{"role": "system", "content": REVIEWER}, {"role": "user", "content": json.dumps(d, ensure_ascii=False)}], 0.2))
                    if not rv.get("pass", True):
                        errs = [f"검수: {x}" for x in rv.get("issues", ["검수 불통과"])]
                    notes.append(f"{attempt}차 LLM 검수: {'통과' if not errs else '불통과 ' + '; '.join(rv.get('issues', []))}")
                except Exception as ex:  # noqa: BLE001
                    notes.append(f"{attempt}차 LLM 검수 호출 실패(규칙 검사만 통과): {ex}")
        if not errs:
            break
        notes.append(f"{attempt}차 오류: " + " / ".join(errs))
        print(f"[{attempt}차 실패] " + "\n".join(errs), file=sys.stderr)
        msgs += [{"role": "assistant", "content": raw}, {"role": "user", "content": "다음 문제를 모두 고쳐서 JSON만 다시 출력하라:\n- " + "\n- ".join(errs)}]
    else:
        print("규칙을 통과하는 대본을 만들지 못함 → 영상 만들지 않음", file=sys.stderr)
        return 3
    prev = st["used"][-1] if st["used"] else {}
    recent = [m for u in st["used"][-3:] for m in u.get("moves", [])]
    moves, gests, moods = design(d, prev, recent)
    topic = d.pop("topic", cands[0])
    facts = d.pop("facts", [])
    # 이전 cards.json 보관
    if CARDS.exists():
        old = json.loads(CARDS.read_text("utf-8"))
        arch = CARDS.parent / f"cards.{old.get('name', 'previous')}.json"
        if old.get("name") and not arch.exists():
            arch.write_text(json.dumps(old, ensure_ascii=False, indent=2), "utf-8")
    CARDS.write_text(json.dumps(d, ensure_ascii=False, indent=2), "utf-8")
    st["used"].append({"topic": topic, "name": d["name"], "date": f"{today:%Y-%m-%d}", "moves": moves, "gestures": gests, "moods": moods})
    TOPICS.write_text(json.dumps(st, ensure_ascii=False, indent=1), "utf-8")
    brief = ROOT / f"content/briefs/{d['name']}.md"
    brief.parent.mkdir(parents=True, exist_ok=True)
    brief.write_text(
        f"# {d['name']} — {d['title']}\n(자동 생성 {today:%Y-%m-%d %H:%M} KST, 주제: {topic})\n\n## 대본(voice)\n"
        + "\n".join(f"{i + 1}. {s['voice']}" for i, s in enumerate(d["scenes"]))
        + "\n\n## 연출\n" + "\n".join(f"- item{s['n']}: icon={s.get('icon', '-')} move={s['move']} gesture={s['gesture']} mood={s.get('mood', '-')}" for s in d["scenes"] if s["type"] == "item")
        + "\n" + "\n".join(f"- {s['type']}: mood={s.get('mood', '기본(놀람)')}" for s in d["scenes"] if s["type"] != "item")
        + "\n\n## 게시 전 확인할 사실 (LLM이 적은 목록, 출처 직접 확인 안 됨)\n" + "\n".join(f"- {f}" for f in facts)
        + "\n\n## 검수 기록(자동)\n" + "\n".join(f"- {n}" for n in notes) + "\n- 의료·화장품 주장의 출처는 확인하지 않음(미확인). 사람 검수 없음\n", "utf-8")
    qp = ROOT / "content/queue.json"
    q = json.loads(qp.read_text("utf-8")) if qp.exists() else []
    q.append({"name": d["name"], "title": d["title"], "description": description(d), "tags": [t.lstrip("#") for t in d["hashtags"]], "status": "generated", "created": f"{today:%Y-%m-%d %H:%M}"})
    qp.write_text(json.dumps(q, ensure_ascii=False, indent=1), "utf-8")
    print(f"생성 완료: {d['name']} / {d['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
