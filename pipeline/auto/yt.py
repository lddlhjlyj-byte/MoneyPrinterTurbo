#!/usr/bin/env python3
"""유튜브 API 공용 코드(토큰 교환·점검·삭제). 업로드(upload_youtube.py)와 yt-check·yt-delete 워크플로가 같이 쓴다.
사용: python3 pipeline/auto/yt.py check            자격 정보·토큰 교환 점검(값은 출력하지 않음)
      python3 pipeline/auto/yt.py delete ID1,ID2   영상 삭제
환경변수: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

KEYS = ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN")


def _exchange():
    body = urllib.parse.urlencode({"client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
                                   "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=body), timeout=60) as r:
        return json.load(r)


def access_token():
    return _exchange()["access_token"]


def check():
    for k in KEYS:
        print(k, "등록됨" if os.environ.get(k) else "없음", "(길이 %d)" % len(os.environ.get(k, "")))
    if not all(os.environ.get(k) for k in KEYS):
        return 1
    try:
        print("토큰 교환 성공. 범위:", _exchange().get("scope"))
        return 0
    except urllib.error.HTTPError as e:
        print("토큰 교환 실패:", e.code, e.read()[:200].decode("utf-8", "replace"))
        return 1


def delete(ids):
    tok = access_token()
    bad = 0
    for v in [x.strip() for x in ids.split(",") if x.strip()]:
        req = urllib.request.Request("https://www.googleapis.com/youtube/v3/videos?id=" + urllib.parse.quote(v), method="DELETE",
                                     headers={"Authorization": "Bearer " + tok})
        try:
            print(v, "삭제 응답", urllib.request.urlopen(req, timeout=60).status)
        except urllib.error.HTTPError as e:
            bad = 1
            print(v, "실패", e.code, e.read()[:300].decode("utf-8", "replace"))
    return bad


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "check":
        sys.exit(check())
    if cmd == "delete" and len(sys.argv) > 2:
        sys.exit(delete(sys.argv[2]))
    print(__doc__)
    sys.exit(2)
