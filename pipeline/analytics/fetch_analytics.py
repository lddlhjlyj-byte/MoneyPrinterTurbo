#!/usr/bin/env python3
"""YouTube Analytics API로 채널 영상별 지표를 가져와 content/analytics/ 에 저장한다. (표준 라이브러리만 사용)
환경변수: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (GitHub Secrets). 선택: ANALYTICS_START(기본 2026-11-09), ANALYTICS_END(기본 오늘 UTC)
저장: content/analytics/latest.json(원본), content/analytics/report.txt(요약).
각 조회는 따로 실패해도 나머지를 계속하고, 실패한 항목은 report.txt에 오류 그대로 적는다(토큰·비밀번호는 출력하지 않는다)."""
import datetime
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(os.environ.get("PIPELINE_ROOT") or Path(__file__).resolve().parents[2])
OUT = ROOT / "content/analytics"
API = "https://youtubeanalytics.googleapis.com/v2/reports"
START = os.environ.get("ANALYTICS_START", "2026-11-09")
END = os.environ.get("ANALYTICS_END") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
PICKS = [0.05, 0.10, 0.25, 0.50, 0.75, 0.95]  # 영상 길이 대비 지점


def http(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def get_token():
    body = urllib.parse.urlencode({
        "client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    return http("https://oauth2.googleapis.com/token", body, {"Content-Type": "application/x-www-form-urlencoded"})


def report(token, **params):
    q = {"ids": "channel==MINE", "startDate": START, "endDate": END, **params}
    return http(API + "?" + urllib.parse.urlencode(q), headers={"Authorization": f"Bearer {token}"})


def safe(label, fn):
    try:
        return {"ok": True, "data": fn()}
    except urllib.error.HTTPError as ex:
        return {"ok": False, "error": f"{label}: HTTP {ex.code} {ex.read()[:300].decode('utf-8', 'replace')}"}
    except Exception as ex:  # noqa: BLE001
        return {"ok": False, "error": f"{label}: {type(ex).__name__} {str(ex)[:300]}"}


def rows(resp):
    """columnHeaders+rows → 딕셔너리 목록"""
    names = [h["name"] for h in resp.get("columnHeaders", [])]
    return [dict(zip(names, r)) for r in resp.get("rows", [])]


def retention_at(curve):
    """curve: [{elapsedVideoTimeRatio, audienceWatchRatio, ...}] → 지정 지점의 시청 유지율(가장 가까운 지점)"""
    if not curve:
        return {}
    pts = sorted(curve, key=lambda x: x["elapsedVideoTimeRatio"])
    out = {}
    for p in PICKS:
        best = min(pts, key=lambda x: abs(x["elapsedVideoTimeRatio"] - p))
        out[f"{int(p * 100)}%"] = best["audienceWatchRatio"]
    return out


def build_report(res):
    L = [f"조회 기간: {START} ~ {END} (분석 데이터는 1~3일 지연될 수 있음)", ""]
    raw = res["raw"]
    errs = [v["error"] for k, v in raw.items() if k in ("videos", "traffic_channel", "content_type") and not v.get("ok")]
    for group in ("retention", "traffic_video"):
        errs += [v["error"] for v in raw.get(group, {}).values() if not v.get("ok")]
    vid = raw.get("videos", {})
    L.append("## 영상별 지표")
    if vid.get("ok"):
        for r in rows(vid["data"]):
            L.append(f"- {r.get('video')}: 조회 {r.get('views')}, 시청분 {r.get('estimatedMinutesWatched')}, "
                     f"평균 시청 {r.get('averageViewDuration')}초, 평균 시청 비율 {r.get('averageViewPercentage')}%, "
                     f"좋아요 {r.get('likes')}, 댓글 {r.get('comments')}, 공유 {r.get('shares')}, 구독 증가 {r.get('subscribersGained')}")
    else:
        L.append("(조회 실패)")
    L += ["", "## 시청 유지율 (영상 길이 대비 지점별, 1.0=100%)"]
    for v, d in res["retention"].items():
        L.append(f"- {v}: " + (", ".join(f"{k} {x:.2f}" for k, x in d.items()) if d else "데이터 없음"))
    L += ["", "## 유입 경로 (채널 전체)"]
    tc = res["raw"].get("traffic_channel", {})
    if tc.get("ok"):
        for r in rows(tc["data"]):
            L.append(f"- {r.get('insightTrafficSourceType')}: 조회 {r.get('views')}, 시청분 {r.get('estimatedMinutesWatched')}")
    L += ["", "## 콘텐츠 유형별 (쇼츠 등)"]
    ct = res["raw"].get("content_type", {})
    if ct.get("ok"):
        for r in rows(ct["data"]):
            L.append(f"- {r.get('creatorContentType')}: 조회 {r.get('views')}")
    if errs:
        L += ["", "## 실패한 조회 (원문)"] + [f"- {e}" for e in errs]
    return "\n".join(L) + "\n"


def main():
    for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"):
        if not os.environ.get(k):
            print(f"{k} 없음: GitHub Secrets 확인", file=sys.stderr)
            return 2
    try:
        tok = get_token()
    except urllib.error.HTTPError as ex:
        print(f"토큰 갱신 실패: HTTP {ex.code} {ex.read()[:300].decode('utf-8', 'replace')}", file=sys.stderr)
        return 3
    token = tok["access_token"]
    print("승인된 권한:", tok.get("scope"))
    if "yt-analytics.readonly" not in (tok.get("scope") or ""):
        print("경고: 분석 읽기 권한(yt-analytics.readonly)이 토큰에 없음", file=sys.stderr)

    raw = {}
    raw["videos"] = safe("videos", lambda: report(
        token, dimensions="video", sort="-views", maxResults="50",
        metrics="views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained"))
    raw["traffic_channel"] = safe("traffic_channel", lambda: report(
        token, dimensions="insightTrafficSourceType", metrics="views,estimatedMinutesWatched", sort="-views"))
    raw["content_type"] = safe("content_type", lambda: report(
        token, dimensions="creatorContentType", metrics="views,estimatedMinutesWatched"))

    ids = [r["video"] for r in rows(raw["videos"]["data"])] if raw["videos"].get("ok") else []
    raw["retention"], raw["traffic_video"] = {}, {}
    retention = {}
    for v in ids:
        raw["retention"][v] = safe(f"retention {v}", lambda v=v: report(
            token, dimensions="elapsedVideoTimeRatio", metrics="audienceWatchRatio,relativeRetentionPerformance",
            filters=f"video=={v}"))
        raw["traffic_video"][v] = safe(f"traffic {v}", lambda v=v: report(
            token, dimensions="insightTrafficSourceType", metrics="views", filters=f"video=={v}", sort="-views"))
        r = raw["retention"][v]
        retention[v] = retention_at(rows(r["data"])) if r.get("ok") else {}

    res = {"period": [START, END], "raw": raw, "retention": retention}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "latest.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), "utf-8")
    text = build_report(res)
    # 영상별 유입 경로는 요약에 같이 적는다
    extra = ["", "## 영상별 유입 경로"]
    for v, r in raw["traffic_video"].items():
        extra.append(f"- {v}: " + (", ".join(f"{x.get('insightTrafficSourceType')} {x.get('views')}" for x in rows(r["data"])) if r.get("ok") else "조회 실패"))
    text += "\n".join(extra) + "\n"
    (OUT / "report.txt").write_text(text, "utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
