#!/usr/bin/env python3
"""렌더링된 영상을 유튜브에 '비공개 + 예약 공개(publishAt)'로 업로드한다. 자격 정보가 없으면 건너뛰고 queue에 'rendered'로 남긴다
(그러면 Claude가 다음 세션에서 Metricool로 예약한다). 환경변수: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN"""
import datetime
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parents[1]
CFG = json.loads((HERE / "config.json").read_text("utf-8"))
KST = datetime.timezone(datetime.timedelta(hours=9))
QP = ROOT / "content/queue.json"


def publish_at():
    now = datetime.datetime.now(KST)
    t = now.replace(hour=CFG["publish_hour_kst"], minute=0, second=0, microsecond=0)
    if t < now + datetime.timedelta(minutes=30):
        t += datetime.timedelta(days=1)
    return t.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def access_token():
    body = urllib.parse.urlencode({"client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
                                   "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=body), timeout=60) as r:
        return json.load(r)["access_token"]


def main(name):
    q = json.loads(QP.read_text("utf-8")) if QP.exists() else []
    e = next((x for x in q if x["name"] == name and x["status"] in ("generated", "rendered")), None)
    if not e:
        print(f"queue에 '{name}'(대기 상태)가 없음 → 업로드 건너뜀")
        return 0
    video = ROOT / f"content/videos/{name}.mp4"
    thumb = ROOT / f"content/thumbnails/{name}.png"
    if not video.exists():
        e["status"], e["error"] = "generated", "영상 파일 없음"
        QP.write_text(json.dumps(q, ensure_ascii=False, indent=1), "utf-8")
        return 0
    if not all(os.environ.get(k) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN")):
        e["status"] = "rendered"
        QP.write_text(json.dumps(q, ensure_ascii=False, indent=1), "utf-8")
        print("유튜브 자격 정보 없음 → 'rendered'로 대기 (Claude가 Metricool로 예약)")
        return 0
    try:
        tok = access_token()
        pa = publish_at()
        meta = {"snippet": {"title": e["title"], "description": e["description"], "tags": e["tags"], "categoryId": "26", "defaultLanguage": "ko"},
                "status": {"privacyStatus": "private", "publishAt": pa, "selfDeclaredMadeForKids": False}}
        data = video.read_bytes()
        init = urllib.request.Request(
            "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
            data=json.dumps(meta).encode(), method="POST",
            headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8",
                     "X-Upload-Content-Length": str(len(data)), "X-Upload-Content-Type": "video/mp4"})
        with urllib.request.urlopen(init, timeout=120) as r:
            loc = r.headers["Location"]
        put = urllib.request.Request(loc, data=data, method="PUT", headers={"Content-Type": "video/mp4", "Content-Length": str(len(data))})
        with urllib.request.urlopen(put, timeout=900) as r:
            vid = json.load(r)["id"]
        e.update(status="uploaded", videoId=vid, publishAt=pa)
        print(f"업로드 완료: {vid}, 공개 예약 {pa}")
        if thumb.exists():
            try:
                th = urllib.request.Request(f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}&uploadType=media",
                                            data=thumb.read_bytes(), method="POST", headers={"Authorization": f"Bearer {tok}", "Content-Type": "image/png"})
                urllib.request.urlopen(th, timeout=120).read()
            except Exception as ex:  # noqa: BLE001
                print(f"썸네일 지정 실패(인증된 채널만 가능, 영상은 올라감): {ex}")
    except urllib.error.HTTPError as ex:
        e["status"], e["error"] = "rendered", f"HTTP {ex.code}: {ex.read()[:300].decode('utf-8', 'replace')}"
        print("업로드 실패:", e["error"])
    except Exception as ex:  # noqa: BLE001
        e["status"], e["error"] = "rendered", str(ex)[:300]
        print("업로드 실패:", ex)
    QP.write_text(json.dumps(q, ensure_ascii=False, indent=1), "utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
