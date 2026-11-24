#!/usr/bin/env python3
"""새 영상·대본 중복 검토 (2026-11-24 사용자 지시: 중복이면 만들지 않는다).
사용: python3 pipeline/dup_check.py <cards.json>   (대본·영상 제작 전에 실행)
- 같은 name/제목이면 '중복'(만들지 않음)
- 장면 대사 3글자 조각 겹침(작은 쪽 기준) 0.6 이상인 장면이 전체의 절반 이상이면 '중복'
- 일부 장면만 겹치면 '일부 겹침'으로 장면을 알려 준다(사용자에게 보고). 숫자는 기계 점검일 뿐, 같은 조언이 다른 말로 반복되는지는 사람이 읽고 판단한다."""
import json, re, sys, glob, os
path = next((a for a in sys.argv[1:] if not a.startswith("--")), "shorts-video/src/cards.json")
new = json.load(open(path, encoding="utf-8"))

def grams(s, n=3):
    s = re.sub(r"[^가-힣0-9]", "", s)
    return {s[i:i + n] for i in range(len(s) - n + 1)}

def norm(t): return re.sub(r"\s", "", t or "")
nv = [s.get("voice", "") for s in new["scenes"]]
dup, part = [], []
for p in sorted(glob.glob("projects/*/04_script/cards.json")):
    name = p.split("/")[1]
    if name == new.get("name"): continue
    try: old = json.load(open(p, encoding="utf-8"))
    except Exception: continue
    if norm(old.get("title")) == norm(new.get("title")):
        dup.append(f"{name}: 제목 같음"); continue
    ov = [s.get("voice", "") for s in old["scenes"]]
    hit = []
    for i, v in enumerate(nv):
        g = grams(v)
        best = max(((len(g & grams(o)) / min(len(g), len(grams(o))) if g and grams(o) else 0), j) for j, o in enumerate(ov))
        if best[0] >= 0.6: hit.append((i + 1, best[1] + 1, round(best[0], 2)))
    if hit and len(hit) >= len(nv) / 2: dup.append(f"{name}: 장면 {len(hit)}/{len(nv)}개 겹침 {hit}")
    elif hit: part.append(f"{name}: 일부 겹침 {hit} (새 장면, 기존 장면, 겹침률)")
print(f"[{new.get('name')}] 기존 영상 {len(glob.glob('projects/*/04_script/cards.json'))}개와 비교")
for x in dup: print("중복(만들지 않음):", x)
for x in part: print("일부 겹침(사용자에게 보고):", x)
if not dup and not part: print("겹침 없음(기계 점검. 같은 조언의 다른 표현은 직접 읽고 확인할 것)")
sys.exit(1 if dup else 0)
