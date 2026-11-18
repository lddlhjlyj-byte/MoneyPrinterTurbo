"""shorts-video/src/motions.ts의 동작 이름(100개)을 읽어 온다. 검수·자동 제작이 같은 목록을 쓰게 하려는 공용 모듈."""
import re
from pathlib import Path

_TS = Path(__file__).resolve().parents[1] / "shorts-video/src/motions.ts"


def motion_names():
    """motions.ts의 MOTIONS 키 목록(파일에 적힌 순서). 파일이 없으면 빈 목록."""
    try:
        text = _TS.read_text("utf-8")
    except OSError:
        return []
    return re.findall(r"^  (\w+): d\(", text, flags=re.M)
