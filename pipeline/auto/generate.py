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
import rules  # noqa: E402

ROOT = Path(os.environ.get("PIPELINE_ROOT") or HERE.parents[1])
CFG = rules.CFG
CARDS = ROOT / "shorts-video/src/cards.json"
TOPICS = HERE / "topics.json" if not os.environ.get("PIPELINE_ROOT") else ROOT / "pipeline/auto/topics.json"
KST = datetime.timezone(datetime.timedelta(hours=9))


# ───────── LLM 호출 ─────────
def _post(url, headers, body, timeout=120):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)["choices"][0]["message"]["content"]


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
    return block + '\n- 출력 JSON 최상위에 "topic"(고른 주제 원문)도 넣는다.\n- 화장품 제품명이 "재생", "치료", "개선" 같은 효능 단어를 포함하면 쓰지 않는다.'


REVIEWER = """너는 쇼츠 검수자다. 아래 cards.json을 읽고 JSON만 출력한다: {"pass": true|false, "issues": ["..."]}.
fail 기준: ①후킹이 눈에 보이는 장면·시청자 본인 경험 없이 추상적 ②효능 보장·과장·단정 ③대본과 화면 글자가 서로 어긋남 ④아이콘이 장면 내용과 무관 ⑤근거 없는 수치.
사소한 표현 차이는 통과시킨다. issues는 고칠 점을 구체적으로 쓴다."""


def season(m):
    return {12: "겨울", 1: "겨울", 2: "겨울", 3: "봄", 4: "봄", 5: "봄", 6: "여름", 7: "여름", 8: "여름", 9: "가을", 10: "가을", 11: "가을 끝·초겨울"}[m]


# ───────── 연출 지정 (표정·동작·제스처를 장면 내용에 맞춰, 직전 영상과 겹치지 않게) ─────────
MOVES = ["run", "rise", "spinJump", "bounce", "hop3", "sway", "tilt", "nod", "shiver"]
GESTS = ["both", "pointR", "pointL", "cheer", "wave", "up", "count"]
CAUTION = ("주의", "자극", "따가", "붉", "확인", "조심", "중단")


def design(d, prev):
    pm, pg = prev.get("moves", []), prev.get("gestures", [])
    items = [s for s in d["scenes"] if s["type"] == "item"]
    moves, gests = [], []
    for k, s in enumerate(items):
        caution = any(w in s["voice"] + s["head"] for w in CAUTION)
        pool = [m for m in MOVES if m not in moves and (k >= len(pm) or m != pm[k])]
        mv = "tremble" if caution else pool[(k * 3 + len(d["name"])) % len(pool)]
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
    return moves, gests


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
    moves, gests = design(d, prev)
    topic = d.pop("topic", cands[0])
    # 이전 cards.json 보관
    if CARDS.exists():
        old = json.loads(CARDS.read_text("utf-8"))
        arch = CARDS.parent / f"cards.{old.get('name', 'previous')}.json"
        if old.get("name") and not arch.exists():
            arch.write_text(json.dumps(old, ensure_ascii=False, indent=2), "utf-8")
    CARDS.write_text(json.dumps(d, ensure_ascii=False, indent=2), "utf-8")
    st["used"].append({"topic": topic, "name": d["name"], "date": f"{today:%Y-%m-%d}", "moves": moves, "gestures": gests})
    TOPICS.write_text(json.dumps(st, ensure_ascii=False, indent=1), "utf-8")
    brief = ROOT / f"content/briefs/{d['name']}.md"
    brief.parent.mkdir(parents=True, exist_ok=True)
    brief.write_text(
        f"# {d['name']} — {d['title']}\n(자동 생성 {today:%Y-%m-%d %H:%M} KST, 주제: {topic})\n\n## 대본(voice)\n"
        + "\n".join(f"{i + 1}. {s['voice']}" for i, s in enumerate(d["scenes"]))
        + "\n\n## 연출\n" + "\n".join(f"- item{s['n']}: icon={s.get('icon', '-')} move={s['move']} gesture={s['gesture']}" for s in d["scenes"] if s["type"] == "item")
        + "\n\n## 검수 기록(자동)\n" + "\n".join(f"- {n}" for n in notes) + "\n- 의료·화장품 주장의 출처는 확인하지 않음(미확인). 사람 검수 없음\n", "utf-8")
    qp = ROOT / "content/queue.json"
    q = json.loads(qp.read_text("utf-8")) if qp.exists() else []
    q.append({"name": d["name"], "title": d["title"], "description": description(d), "tags": [t.lstrip("#") for t in d["hashtags"]], "status": "generated", "created": f"{today:%Y-%m-%d %H:%M}"})
    qp.write_text(json.dumps(q, ensure_ascii=False, indent=1), "utf-8")
    print(f"생성 완료: {d['name']} / {d['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
