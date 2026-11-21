#!/usr/bin/env python3
"""영상 1개 = projects/<슬러그>/ 폴더 1개. 아래 9단계 폴더에 단계별 산출물을 모은다.
사용:
  python3 pipeline/project.py new <슬러그>        폴더·단계 안내 파일·status.json 생성(이미 있으면 건드리지 않음)
  python3 pipeline/project.py from-cards <슬러그>  shorts-video/src/cards.json → 04_script, 05_narration 채움
  python3 pipeline/project.py sync <슬러그>        렌더링 뒤 06_voice, 07_video, 08_verify(자동 측정분), 09_publish 채움
  python3 pipeline/project.py check <슬러그>       단계별 필수 파일·상태 점검(없거나 '확인 전'이면 표시)
  python3 pipeline/project.py backfill all         projects/ 없는 기존 영상을 git 이력의 cards.json으로 소급 정리
상태 값: done(확인함) / auto(자동 측정·생성만 됨, 사람·Claude 확인 전) / pending(안 함)
이 스크립트는 값을 지어내지 않는다. 확인하지 못한 항목은 pending 또는 '미확인'으로 남긴다."""
import datetime
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(os.environ.get("PIPELINE_ROOT") or Path(__file__).resolve().parents[1])
PROJECTS = ROOT / "projects"
KST = datetime.timezone(datetime.timedelta(hours=9))

# (폴더, 이름, 필수 파일, 안내)
STAGES = [
    ("01_research", "조사", ["research.md"], "경쟁 영상, 키워드, 출처 URL, 사실 확인. 출처 없는 수치는 '미확인'으로 적는다."),
    ("02_topic", "주제선정", ["topic.md"], "후보 목록과 선택 이유(계절·시청자 관심·중복 여부)."),
    ("03_plan", "기획서", ["plan.md"], "시청자, 한 줄 약속, 후킹 후보 3개 이상과 선택 이유, 기승전결."),
    ("04_script", "스크립트", ["scenes.json"], "장면 구성과 화면 키워드(장면 종류·화면 글자·그림·move·gesture·mood)."),
    ("05_narration", "대본", ["script.json"], "나레이션 문장(장면별 voice). 사용자가 준 대본은 문구를 바꾸지 않는다."),
    ("06_voice", "음성·자막", ["voice.json"], "음성 종류·속도, 장면별 음성 길이와 말하는 구간, 자막."),
    ("07_video", "영상", ["video.json"], "소스(클립·효과음)와 합성 영상의 위치·길이. 영상 파일 자체는 content/videos에 둔다."),
    ("08_verify", "검증", ["facts.md", "script_review.md", "voice_check.md", "video_check.md", "license.md"],
     "사실 출처 / 대본 검수 / 음성 오독 / 영상 확인 / 라이선스."),
    ("09_publish", "게시", ["publish.json"], "제목, 설명, 해시태그, 썸네일, 출처, 예약 시각."),
]
PENDING_TEXT = "상태: pending (아직 작성·확인하지 않음)\n"


def now():
    return datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M")


def pdir(slug):
    return PROJECTS / slug


def _w(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text if isinstance(text, str) else json.dumps(text, ensure_ascii=False, indent=2), "utf-8")


def _status(slug):
    p = pdir(slug) / "status.json"
    return json.loads(p.read_text("utf-8")) if p.exists() else {}


def set_status(slug, stage, state, note=""):
    st = _status(slug)
    st[stage] = {"state": state, "note": note, "updated": now()}
    _w(pdir(slug) / "status.json", st)


def scaffold(slug):
    base = pdir(slug)
    for folder, label, files, guide in STAGES:
        d = base / folder
        d.mkdir(parents=True, exist_ok=True)
        g = d / "_STAGE.md"
        if not g.exists():
            _w(g, f"# {folder} — {label}\n{guide}\n\n필수 파일: {', '.join(files)}\n")
        for f in files:
            if not (d / f).exists():
                if f.endswith(".json"):
                    _w(d / f, {"status": "pending"})
                else:
                    _w(d / f, PENDING_TEXT)
    st = _status(slug)
    for folder, *_ in STAGES:
        st.setdefault(folder, {"state": "pending", "note": "", "updated": now()})
    _w(base / "status.json", st)
    return base


def is_pending(path):
    if not path.exists():
        return True
    t = path.read_text("utf-8").strip()
    if path.suffix == ".json":
        try:
            j = json.loads(t)
        except ValueError:
            return True
        return isinstance(j, dict) and j.get("status") == "pending"
    return t.startswith("상태: pending")


# ───────── 04·05: cards.json에서 채움 ─────────
def from_cards(slug, cards=None):
    cards = cards or json.loads((ROOT / "shorts-video/src/cards.json").read_text("utf-8"))
    scaffold(slug)
    base = pdir(slug)
    scenes = []
    for i, s in enumerate(cards["scenes"]):
        screen = {k: s[k] for k in ("line1", "line2", "warn", "head", "sub", "tags", "rows", "text", "num", "title", "note") if k in s}
        scenes.append({"no": i + 1, "type": s["type"], "n": s.get("n"), "screen": screen,
                       "visual": {k: s[k] for k in ("icon", "kind", "icons", "deco") if k in s},
                       "direction": {k: s[k] for k in ("move", "gesture", "mood", "worry") if k in s}})
    _w(base / "04_script/cards.json", cards)  # 재렌더링용 원본(shorts-video/src/cards.<name>.json 보관본 대체)
    _w(base / "04_script/scenes.json", {"name": cards["name"], "title": cards["title"], "scenes": scenes})
    _w(base / "05_narration/script.json", {"name": cards["name"], "scenes": [
        {"no": i + 1, "type": s["type"], "voice": s["voice"], "chars": len(s["voice"])} for i, s in enumerate(cards["scenes"])],
        "total_chars": sum(len(s["voice"]) for s in cards["scenes"])})
    set_status(slug, "04_script", "auto", "cards.json에서 추출")
    set_status(slug, "05_narration", "auto", "cards.json에서 추출")
    return base


# ───────── 자동 제작(generate.py)이 렌더링 전에 채우는 단계 ─────────
def write_pre_render(slug, cards, topic, candidates, season_text, facts, notes, rule_result):
    base = from_cards(slug, cards)
    hook = next(s for s in cards["scenes"] if s["type"] == "hook")
    _w(base / "02_topic/topic.md",
       f"# 주제 선정 ({now()} KST)\n- 선택: {topic}\n- 선택 기준: 지금 계절({season_text})과 시청자 관심에 맞는 후보 중 LLM이 고름. 사용자 우선 주제가 있으면 그것을 씀\n"
       "- 후보 목록(생성 시점):\n" + "\n".join(f"  - {c}" for c in candidates)
       + "\n- 주의: 선택 이유는 LLM 판단이며 검색 데이터로 확인하지 않음(미확인)\n")
    set_status(slug, "02_topic", "auto", "LLM 선택, 데이터 확인 전")
    _w(base / "03_plan/plan.md",
       f"# 기획 ({now()} KST)\n- 주제: {topic}\n- 제목: {cards['title']}\n- 후킹(선택): {hook['voice']}\n"
       "- 후킹 후보 3개 이상과 선택 이유: 자동 제작은 후보를 따로 기록하지 않음(미기록)\n"
       "- 기승전결: hook(승) → item들(전) → summary(결) → outro. 구체 흐름은 04_script/scenes.json\n")
    set_status(slug, "03_plan", "auto", "후킹 후보·선택 이유 미기록")
    _w(base / "01_research/research.md",
       "# 조사\n- 경쟁 영상·키워드 검색: 자동 제작에서는 수행하지 않음(미수행)\n- 대본이 근거로 삼은 주장 목록(LLM 작성, 출처 직접 확인 안 됨)은 08_verify/facts.md\n")
    set_status(slug, "01_research", "pending", "자동 제작은 웹 조사를 하지 않음. Claude 세션에서 채워야 함")
    _w(base / "08_verify/facts.md",
       "# 사실 출처\n상태: auto (LLM이 적은 목록, 출처 URL 확인 안 됨)\n\n" + "\n".join(f"- {f}" for f in facts) + "\n")
    _w(base / "08_verify/script_review.md",
       f"# 대본 검수 ({now()} KST)\n- 규칙 검사(rules.py): {rule_result}\n" + "\n".join(f"- {n}" for n in notes)
       + "\n- 사람 검수 없음\n")
    set_status(slug, "08_verify", "auto", "facts·대본검수 자동 기록, 음성·영상·라이선스는 확인 전")
    return base


# ───────── 렌더링 뒤: 06~09 채움 ─────────
def sync(slug, cards=None, with_verify=True):
    if cards is None:
        cards = json.loads((ROOT / "shorts-video/src/cards.json").read_text("utf-8"))
    if cards.get("name") != slug:
        print(f"경고: cards.json name({cards.get('name')})이 {slug}와 다름 → 06 음성 정보는 건너뜀", file=sys.stderr)
        cards = None
    scaffold(slug)
    base = pdir(slug)
    if cards:
        _w(base / "06_voice/voice.json", {
            "engine": "edge-tts", "voice": "ko-KR-SunHiNeural", "rate": "+10%",
            "scenes": [{"no": i + 1, "audio": s.get("audio"), "seconds": s.get("seconds"),
                        "speechStart": s.get("speechStart"), "speechEnd": s.get("speechEnd"), "text": s["voice"]}
                       for i, s in enumerate(cards["scenes"])],
            "subtitles": "비트 자막: shorts-video/src/Beats.tsx가 voice 문장 단위로 자동 분할(별도 자막 파일 없음)"})
        set_status(slug, "06_voice", "auto", "음성 길이·구간만 측정, 발음 확인 전")
    vid = ROOT / f"content/videos/{slug}.mp4"
    thumb = ROOT / f"content/thumbnails/{slug}.png"
    _w(base / "07_video/video.json", {
        **({} if vid.exists() else {"status": "pending"}),
        "video": f"content/videos/{slug}.mp4" if vid.exists() else None,
        "video_bytes": vid.stat().st_size if vid.exists() else None,
        "thumbnail": f"content/thumbnails/{slug}.png" if thumb.exists() else None,
        "renderer": "Remotion InfoCard (shorts-video/)",
        "sources": {"clips": "shorts-video/public/clips", "sfx": "shorts-video/public/sfx", "icons": "shorts-video/src/Icons.tsx(직접 그린 SVG)"},
        "note": "영상 파일은 중복 보관하지 않고 위치만 기록"})
    set_status(slug, "07_video", "auto" if vid.exists() else "pending", "" if vid.exists() else "영상 파일 없음")
    rep = ROOT / "verify/report.txt"
    vc = base / "08_verify/video_check.md"
    if with_verify and rep.exists():
        _w(vc, f"# 영상 확인 (자동 측정)\n상태: auto — 소리·길이·장면 타이밍만 측정함. 발음·자막 내용·화면 품질은 확인하지 못함\n\n```\n{rep.read_text('utf-8')}\n```\n")
        for f in ("probe.txt", "audio.txt"):
            if (ROOT / "verify" / f).exists():
                shutil.copy(ROOT / "verify" / f, base / "08_verify" / f)
    if is_pending(base / "08_verify/voice_check.md"):
        _w(base / "08_verify/voice_check.md", "# 음성 오독 확인\n상태: pending — 숫자·성분명·단위(%, mL, 분) 발음을 직접 들어 확인해야 함. 자동 측정 불가\n")
    if is_pending(base / "08_verify/license.md"):
        _w(base / "08_verify/license.md",
           "# 라이선스\n상태: auto(부분)\n- 음성: edge-tts(Microsoft Edge 온라인 TTS) — 상업 이용 약관 직접 확인 안 됨(미확인)\n"
           "- 그림: 직접 그린 SVG(shorts-video/src/Icons.tsx)\n- 효과음·클립: shorts-video/public/sfx, clips — 출처·라이선스 기록 없음(미확인)\n")
    set_status(slug, "08_verify", "auto", "음성 오독·라이선스는 확인 전")
    if cards and is_pending(base / "04_script/scenes.json"):
        from_cards(slug, cards)  # 사용자 대본 영상은 렌더링 전 기록이 없으므로 여기서 04·05를 채움
    q = next((x for x in (json.loads((ROOT / "content/queue.json").read_text("utf-8")) if (ROOT / "content/queue.json").exists() else []) if x["name"] == slug), None)
    _w(base / "09_publish/publish.json", {
        **({} if q else {"status": "pending"}),
        "title": q["title"] if q else (cards or {}).get("title"),
        "description": q.get("description") if q else None, "tags": q.get("tags") if q else None,
        "thumbnail": f"content/thumbnails/{slug}.png" if thumb.exists() else None,
        "queue_status": q.get("status") if q else None, "publishAt": q.get("publishAt") if q else None,
        "sources": "08_verify/facts.md 참고(출처 URL 확인 전이면 게시 설명에 쓰지 않음)"})
    set_status(slug, "09_publish", "auto" if q else "pending", "queue.json 기준" if q else "queue 항목 없음")
    return base


def _git(*a):
    import subprocess
    return subprocess.run(["git", "-C", str(ROOT), *a], capture_output=True, text=True).stdout


def _measure(mp4):
    import re
    import subprocess
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp4)], capture_output=True, text=True).stdout.strip()
    wh = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", str(mp4)], capture_output=True, text=True).stdout.strip()
    vol = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(mp4), "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"mean_volume: ([-\d.]+)", vol)
    x = re.search(r"max_volume: ([-\d.]+)", vol)
    return float(dur or 0), wh, float(m.group(1)) if m else None, float(x.group(1)) if x else None


def backfill():
    """이미 만든 영상(content/videos/*.mp4)을 git 이력의 cards.json으로 projects/<name>/에 채운다. 이력에 없으면 해당 단계는 pending."""
    by_name = {}
    for h in reversed(_git("log", "--format=%H", "--", "shorts-video/src/cards.json").split()):
        try:
            d = json.loads(_git("show", f"{h}:shorts-video/src/cards.json"))
        except ValueError:
            continue
        if d.get("name") and d.get("scenes"):
            by_name[d["name"]] = d  # 같은 name이면 마지막(최종) 버전
    done = []
    for mp4 in sorted((ROOT / "content/videos").glob("*.mp4")):
        slug = mp4.stem
        had = (pdir(slug) / "status.json").exists()
        if had and not is_pending(pdir(slug) / "04_script/scenes.json"):
            continue  # 이미 채워진 영상은 건드리지 않음(04가 비어 있는 영상만 보정)
        scaffold(slug)
        cards = by_name.get(slug)
        if cards:
            from_cards(slug, cards)
        sync(slug, cards, with_verify=False)
        dur, wh, mean, mx = _measure(mp4)
        if had and not is_pending(pdir(slug) / "08_verify/video_check.md"):
            done.append((slug, bool(cards), round(dur, 1)))
            set_status(slug, "04_script", "auto" if cards else "pending", "git 이력에서 복원" if cards else "git 이력에서 cards를 찾지 못함")
            set_status(slug, "05_narration", "auto" if cards else "pending", "git 이력에서 복원" if cards else "")
            continue
        _w(pdir(slug) / "08_verify/video_check.md",
           f"# 영상 확인 (자동 측정, {now()} KST 소급 기록)\n상태: auto — 길이·해상도·음량만 측정함. 발음·자막 내용·화면 품질은 확인하지 못함\n"
           f"- 길이 {dur:.1f}초 (목표 25~40초{' → 초과' if dur > 40 else ''})\n- 해상도 {wh}\n- 평균 음량 {mean}dB, 최대 {mx}dB\n")
        set_status(slug, "04_script", "auto" if cards else "pending", "git 이력에서 복원" if cards else "git 이력에서 cards를 찾지 못함")
        done.append((slug, bool(cards), round(dur, 1)))
    for r in done:
        print(*r)
    return 0


def check(slug):
    base = pdir(slug)
    if not base.exists():
        print(f"{slug}: projects 폴더 없음 → `python3 pipeline/project.py new {slug}`")
        return 1
    st = _status(slug)
    bad = 0
    for folder, label, files, _ in STAGES:
        miss = [f for f in files if is_pending(base / folder / f)]
        s = st.get(folder, {}).get("state", "pending")
        flag = "OK " if not miss and s == "done" else ("자동" if not miss and s == "auto" else "미완")
        bad += flag == "미완"
        print(f"[{flag}] {folder} {label}: 상태={s}" + (f" / 미작성: {', '.join(miss)}" if miss else ""))
    return 1 if bad else 0


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in ("new", "from-cards", "sync", "check", "backfill"):
        print(__doc__)
        sys.exit(2)
    cmd, slug = sys.argv[1], sys.argv[2]
    if cmd == "backfill":
        sys.exit(backfill())
    if cmd == "new":
        print(scaffold(slug))
    elif cmd == "from-cards":
        print(from_cards(slug))
    elif cmd == "sync":
        print(sync(slug))
    else:
        sys.exit(check(slug))
