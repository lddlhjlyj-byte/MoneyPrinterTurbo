# 쇼츠 파이프라인 작업 노트

새 세션을 시작하면 이 파일을 먼저 읽는다. 세션이 끝날 때마다 아래 "진행 기록"에 추가한다.

## 목표
- AI로 쇼츠/릴스/틱톡 영상을 대량 생산하는 파이프라인 구축 (무료 우선)
- 도구: MoneyPrinterTurbo(v1.3.9) 포크를 Colab에서 실행

## 계정·저장소 (2026-11-06 변경)
- GitHub 계정: `lddlhjlyj-byte` (구글 로그인으로 생성)
- 저장소: `lddlhjlyj-byte/MoneyPrinterTurbo` (harry0703 원본의 포크, main만 복사)
- Claude GitHub 커넥터: `lddlhjlyj-byte`로 연결 완료, 저장소 접근 "모든 저장소"
- Colab 설치 셀(칸 1-A)의 `git clone` 주소는 이 포크로 바뀌어 있음

## 환경 설정 (확인된 값)
- 영상 소스: **Pixabay** (Pexels 키 발급이 중단되어 변경). 코드에서 소스를 지정하지 않으면 Pexels로 돌아 실패한다
- LLM: OpenRouter, 모델 `nvidia/nemotron-3.5-super-vl:free`
- 음성: `ko-KR-SunHiNeural-Female` (코드에서 지정하지 않으면 `Invalid voice ''` 오류)
- 클립 길이: 8초 (WebUI는 접속할 때마다 3으로 돌아가 있었음)
- 자막 위치: custom 62 (플랫폼 제목·버튼 영역을 피하려는 값)
- 한글 폰트: `NanumGothicBold.ttf`는 설치돼 있으나, 렌더링 로그에는 `STHeitiMedium.ttc`가 사용됨 → 한글 자막이 깨지는지 영상으로 확인 필요

## 실행 방법
1. Colab에서 설치 셀(칸 1-A) 실행. 패키지는 `uv` 환경에 설치되므로 일반 파이썬이 아닌 `uv run python`으로 실행해야 한다
2. 일괄 생성 셀의 `TOPICS`에 주제를 추가하고 셀 하나를 실행
3. 결과 영상은 구글 드라이브 `MyDrive/shorts_output`에 저장됨. "저장:" 줄과 폴더 파일로 성공을 판단
4. 웹 화면(WebUI)은 cloudflared 터널 셀로 접속하는 테스트용. 자동화에는 쓰지 않음

## 일괄 생성 셀 (동작 확인된 버전)
```python
import subprocess, textwrap
from pathlib import Path

REPO = Path("/content/MoneyPrinterTurbo")

# ===== 여기만 수정 =====
TOPICS = [
    "코엔자임Q10 올바르게 먹는 법 4가지",
]
CLIP_SECONDS = 8
SUBTITLE_POS = 62.0
VOICE = "ko-KR-SunHiNeural-Female"
VIDEO_SOURCE = "pixabay"
# =======================

from google.colab import drive
drive.mount("/content/drive")
OUT = Path("/content/drive/MyDrive/shorts_output")
OUT.mkdir(parents=True, exist_ok=True)

script = textwrap.dedent(f'''
import sys, uuid, shutil
from pathlib import Path
sys.path.insert(0, "{REPO}")
from app.config import config
from app.models.schema import VideoParams
from app.services import task as tm

if not config.app.get("pixabay_api_keys"):
    print("중단: config.toml에 pixabay_api_keys가 비어 있습니다")
    sys.exit(1)

TOPICS = {TOPICS!r}
OUT = Path("{OUT}")
for i, topic in enumerate(TOPICS, 1):
    print(f"[{{i}}/{{len(TOPICS)}}] {{topic}} 생성 중...")
    params = VideoParams(video_subject=topic, video_language="ko",
                         voice_name="{VOICE}",
                         video_source="{VIDEO_SOURCE}",
                         video_clip_duration={CLIP_SECONDS},
                         subtitle_position="custom", custom_position={SUBTITLE_POS})
    result = tm.start(task_id=str(uuid.uuid4()), params=params)
    vids = (result or {{}}).get("videos", [])
    if not vids:
        print("   실패: 영상이 만들어지지 않았습니다")
    for v in vids:
        dst = OUT / f"{{i}}_{{Path(v).parent.name}}.mp4"
        shutil.copy(v, dst)
        print("   저장:", dst)
''')
Path("/content/run_batch.py").write_text(script, encoding="utf-8")

r = subprocess.run(f"cd {REPO} && uv run python /content/run_batch.py",
                   shell=True, capture_output=True, text=True)
print(r.stdout[-3000:])
print(r.stderr[-3000:])
```

## 알려진 사항
- 영상 1개 렌더링에 약 7분 걸림 (Colab 무료 환경). 주제를 여러 개 넣으면 개수만큼 늘어남
- Colab 런타임이 끊기면 `/content` 안의 파일과 설정 수정이 사라짐. 영상은 드라이브에 저장되므로 유지됨
- API 키는 이 파일에 적지 않는다

## 아직 못 한 것 / 미확인
- 완성 영상에서 자막 위치(62%)와 한글 폰트가 제대로 나오는지 눈으로 확인 전
- 이전 세션에서 논의했다는 하이퍼프레임/애니메이션 구현은 기록이 없어 내용을 모름. 도구 이름·목표를 다시 정해야 함
- 스톡 영상 매칭용 대본 규칙(한 줄 15~20자, 시각적 명사/동사)을 일괄 생성 셀에 연결하는 작업

## 진행 기록
- 2026-11-06: GitHub 계정을 `lddlhjlyj-byte`로 전환, 포크 생성, Colab 일괄 생성 셀로 영상 1개 생성해 드라이브 저장까지 확인
