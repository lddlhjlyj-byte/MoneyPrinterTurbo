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
- 한글 폰트: **한글 자막이 영상에 나오지 않음(2026-11-07 사용자가 영상 확인).** 원인 확인: 기본값 `STHeitiMedium.ttc`를 포함해 `resource/fonts`의 폰트 9개 모두 한글 글자 0/14 지원. 폰트는 `resource/fonts` 안의 파일만 쓸 수 있어서 시스템에 설치된 NanumGothicBold.ttf는 쓰이지 않음 → 한글 폰트 파일을 `resource/fonts`로 복사하고 `font_name`을 코드에서 지정해야 함(수정안은 아래 셀, Colab 실행 확인 전)

## 실행 방법
1. Colab에서 설치 셀(칸 1-A) 실행. 패키지는 `uv` 환경에 설치되므로 일반 파이썬이 아닌 `uv run python`으로 실행해야 한다
2. 일괄 생성 셀의 `TOPICS`에 주제를 추가하고 셀 하나를 실행
3. 결과 영상은 구글 드라이브 `MyDrive/shorts_output`에 저장됨. "저장:" 줄과 폴더 파일로 성공을 판단
4. 웹 화면(WebUI)은 cloudflared 터널 셀로 접속하는 테스트용. 자동화에는 쓰지 않음

## 올인원 셀 (2026-11-07 — 설치·키·폰트·생성을 셀 하나로. Colab 실행은 확인 전)
- 준비(최초 1회): Colab 왼쪽 열쇠 아이콘(보안 비밀)에 `PIXABAY_API_KEY`, `OPENROUTER_API_KEY` 저장 + "노트북 액세스" 켜기. 키는 코드·이 파일에 적지 않는다
- 매일: 이 셀을 붙여넣고 `TOPICS`만 바꿔 실행. 런타임이 초기화돼도 같은 셀이 설치부터 다시 한다
- 확인됨(샌드박스): 셀 문법, config.example.toml 치환 4개 항목이 각각 1회 일치하고 TOML로 정상 해석됨
- 확인됨(Colab 실행): `uv sync --frozen` 설치, 보안 비밀 읽기, 폰트 복사·적용, 영상 생성·드라이브 저장
- 미확인: 영상 속 한글 자막이 실제로 보이는지
```python
import re, shutil, subprocess, textwrap
from pathlib import Path
from google.colab import drive, userdata

# ===== 여기만 수정 =====
TOPICS = [
    {
        "subject": "코엔자임Q10 올바르게 먹는 법 4가지",
        "script": """코엔자임Q10, 공복에 드시나요?
그렇게 드시면 흡수가 떨어집니다
영양제 병을 열기 전에 확인하세요
올바르게 먹는 법 네 가지입니다
하나, 식사 직후에 드세요
아침 식탁의 계란과 함께 삼킵니다
둘, 지방이 있는 음식과 함께
아보카도와 올리브유가 좋습니다
셋, 매일 같은 시간에 드세요
알람 시계를 식탁 옆에 두세요
넷, 복용 중인 약을 확인하세요
약사에게 약 목록을 보여주세요
기억하세요, 식사와 지방이 핵심입니다
식사 직후 물 한 컵과 함께 드세요
오늘 한 가지만 실천해 보세요
도움이 됐다면 팔로우 해주세요""",
        "terms": "supplement bottle, woman taking pill, breakfast table, fried eggs, avocado, olive oil, glass of water, alarm clock, pharmacist, capsules in hand",
    },
]
CLIP_SECONDS = 6
SUBTITLE_POS = 62.0
VOICE = "ko-KR-SunHiNeural-Female"
VIDEO_SOURCE = "pixabay"
FONT = "NanumGothicBold.ttf"
LLM_MODEL = "nvidia/nemotron-3.5-super-vl:free"
# =======================
FORK = "https://github.com/lddlhjlyj-byte/MoneyPrinterTurbo"
REPO = Path("/content/MoneyPrinterTurbo")


def sh(cmd, cwd=None):
    r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        print(r.stdout[-2000:], r.stderr[-2000:])
        raise SystemExit(f"실패: {cmd}")
    return r


def secret(name):
    try:
        return userdata.get(name)
    except Exception:
        raise SystemExit(f"왼쪽 열쇠 아이콘(보안 비밀)에 {name} 을 저장하고 '노트북 액세스'를 켜세요")


pixabay_key = secret("PIXABAY_API_KEY")
openrouter_key = secret("OPENROUTER_API_KEY")

print("1/4 설치 확인...")
if not REPO.exists():
    sh(f"git clone --depth 1 {FORK} {REPO}")
if not (REPO / ".venv").exists():
    sh("pip install -q uv")
    sh("uv sync --frozen", cwd=REPO)

print("2/4 설정 파일 작성...")
cfg = (REPO / "config.example.toml").read_text(encoding="utf-8")
for pattern, value in [
    (r'^pixabay_api_keys = \[\]', f'pixabay_api_keys = ["{pixabay_key}"]'),
    (r'^llm_provider = ".*"', 'llm_provider = "openrouter"'),
    (r'^openrouter_api_key = ""', f'openrouter_api_key = "{openrouter_key}"'),
    (r'^openrouter_model_name = ""', f'openrouter_model_name = "{LLM_MODEL}"'),
]:
    cfg, n = re.subn(pattern, lambda m: value, cfg, count=1, flags=re.M)
    assert n == 1, f"설정 항목을 찾지 못함: {pattern}"
(REPO / "config.toml").write_text(cfg, encoding="utf-8")

print("3/4 한글 폰트 준비...")
sh("apt-get install -y -qq fonts-nanum")
src = next(Path("/usr/share/fonts").rglob(FONT), None)
assert src, "한글 폰트를 찾지 못했습니다"
shutil.copy(src, REPO / "resource" / "fonts" / FONT)

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

TOPICS = {TOPICS!r}
OUT = Path("{OUT}")
for i, t in enumerate(TOPICS, 1):
    print(f"[{{i}}/{{len(TOPICS)}}] {{t['subject']}} 생성 중...")
    params = VideoParams(video_subject=t["subject"], video_language="ko",
                         video_script=t["script"], video_terms=t["terms"],
                         video_concat_mode="sequential",
                         voice_name="{VOICE}", font_name="{FONT}",
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

print("4/4 영상 생성 중... (약 7분, 주제당)")
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
- 한글 폰트 수정 후 영상에서 한글 자막·위치(62%)가 나오는지 확인 전
- 사용자 평가: 발성은 정확한 편이나 영상 완성도가 높아 보이지 않음(구체 원인은 아직 파악 전)
- 하이퍼프레임 트랙: 아래 "하이퍼프레임" 섹션 참고. 음성 연동, 일괄 생성, Colab 실행은 미확인
- 스톡 영상 매칭용 대본 규칙(한 줄 15~20자, 시각적 명사/동사)을 일괄 생성 셀에 연결하는 작업

## 하이퍼프레임 (HyperFrames) — 이전 세션 기록을 2026-11-06에 복구
- 역할 구분: MoneyPrinterTurbo = 스톡영상+음성+자막 쇼츠(수량 트랙) / 하이퍼프레임 = 글자·숫자·도형 애니메이션 카드 영상(품질 트랙, "먹는 법 4가지" 같은 정보 카드형에 적합)
- 정체: HeyGen의 무료 오픈소스(Apache 2.0). HTML에 시간·애니메이션 속성을 붙여 MP4로 렌더링. 필요 환경: Node.js 22 이상 + FFmpeg(+Chrome)
- Claude 연동: `claude plugin install hyperframes@hyperframes`, `npx skills add heygen-com/hyperframes`
- 이전 세션 결과: Claude 샌드박스에서 코큐텐 정보카드 24초(1080×1920, 30fps) MP4 렌더링 성공, 한글 깨짐 없음(확인한 프레임은 2장뿐), 렌더 약 26초
- 걸렸던 문제: 한글 폰트는 `@font-face`로 파일을 직접 지정해야 함 / 렌더 브라우저(Chromium) 경로 별도 지정 / GSAP는 CDN 대신 프로젝트에 파일로 넣어야 렌더됨(샌드박스 CDN 차단 탓일 수 있음)
- 미확인: 음성(TTS)·자막 싱크 연동(샘플은 무음), 무료 Colab에서 실행 가능 여부, 조회수 효과
- 결정 대기: ① edge TTS 음성 입히기 ② 대본 10개 → 영상 10개 일괄 생성 구조로 변환 중 어느 쪽으로 갈지
- 원테이크(OneTake AI)는 무료 플랜 없음(월 $92~), 대본→영상 도구 아님, API 미확인이라 제외

## 리모션 (Remotion) — 2026-11-07 추가
- 정체: React로 영상을 코딩해 MP4로 렌더링하는 도구. 개인·3인 이하 팀은 무료(설치 시 안내 문구 기준)
- 만든 것: `shorts-video` 프로젝트(저장소 밖, 사용자에게 zip으로 전달). 1080×1920, 30fps
  - `Shorts` 합성: `src/script.json`(줄별 text/clip/seconds)의 스톡 영상 + 자막 → MP4
  - `Captioned` 합성: `public/input.mp4` + `captions.json` 또는 `.srt` → 자막 번인(말하는 단어 노란색 강조)
  - `npm run transcribe`: 로컬 Whisper(small, 한국어)로 captions.json 생성
- 확인됨(샌드박스): 두 합성 모두 전체 렌더링 성공(Shorts 9초, Captioned 5초, h264 1080×1920), 한글 자막 깨짐 없음, 테스트 프레임 눈으로 확인
- 걸렸던 문제: 샌드박스에서 Remotion 자체 Chrome 다운로드와 Google Fonts가 차단됨 → 시스템 Chrome(`--browser-executable`) 지정, 한글 폰트는 설치 폰트 목록(Noto Sans KR → Noto Sans CJK KR → 맑은 고딕 → Apple SD Gothic Neo)으로 지정
- 미확인: `npm run transcribe`(Whisper 설치·다운로드가 샌드박스에서 막힘), 음성(TTS) 없음, 스톡 영상 자동 검색·일괄 생성 없음(테스트 영상은 색상 패턴), 사용자 PC·Colab에서의 실행
- 역할 겹침: 스톡+음성+자막 자동 생성은 MoneyPrinterTurbo가 이미 동작. 리모션 `Captioned`은 Vrew/CapCut 등으로 만든 영상에 자막만 입히는 용도

## 영상 제작 스킬 지도 (2026-11-09 검색 결과, 설명문 기준 — 내용 직접 열어보기 전)
- 켜져 있음·직접 사용: infomed-shorts-script(후킹 대본 16줄+영어 키워드), shorts-script-stockmatch, Remotion 플러그인(create/markup/captions/render/studio/multimedia/docs), video-making(렌더링 원칙), AI YouTube OS(daily/new-channel/preflight/channel-operations), image-generation, zizi-skills(design-assets/design-guide/orchestration), marketing(content-creation·seo-audit)
- 켜면 쓸 수 있음(꺼져 있음, 스킬만 있고 외부 서비스 불필요로 보임): Social Media Skills(106개: hook-writer·short-form-video-script·youtube-shorts·thumbnail-design·hashtag-strategy·batch-content-plan·platform-specs-and-validation 등), video-shotcraft(Remotion 연출), ffmpeg-llm
- 별도 계정·크레딧이 필요해 보임(무료 우선 원칙과 충돌, 비용 미확인): ManyMotions 계열, Abracadabrax 계열, Arcads, CreativeClaw, CellCog
- 연결돼 있음: Google Drive, Metricool(예약 게시 도구 있음, 플랜 제한 미확인), Zapier
- 비어 있는 단계: 음성(TTS)은 스킬 없음 → scripts/tts.py(edge-tts)로 대체

## 외부 자동화 후보 (2026-11-09 검색, README 요약만 확인 — 실제 실행 전)
- rushindrasinha/youtube-shorts-pipeline (MIT, 별 약 2.3k): 주제→대본→음성→자막→ffmpeg→YouTube 업로드. Edge TTS·Ollama 무료. `--lang ko` 옵션 있으나 한글 음성·자막 품질 미확인. TikTok/Reels 업로드·예약 배치는 v3.1 예정(미출시)
- gyoridavid/short-video-maker (MIT, 별 1.3k): MCP+REST, Docker. 영어만 지원(Kokoro) → 한국어 부적합
- Chamanrajragu/purffle-shorts: 별 14개, 검증 부족
- 목록: sasharun/awesome-faceless, AbdullahNaveed/ai-shorts-generator, SaarD00/AI-Youtube-Shorts-Generator (내용 미확인)
- 꺼져 있는 플러그인: IT Reelsmaker(talking-head 편집용), BlitzReels, TubeAlfred YouTube(읽기 전용 분석), vidIQ(커넥터). 요금 미확인. 켜는 것은 사용자가 직접
- 다음 후보 작업: youtube-shorts-pipeline 포크 → 한국어 영상 1개 생성 → 눈으로 확인 후 InfoCard 방식과 비교

## 진행 기록
- 2026-11-07 밤: 사용자 요청 — "머리 크고 몸통 없음, 짧은 다리·팔, 눈썹·코 없음, 눈이 얼굴의 1/3인 귀여운 캐릭터가 설명하는 영상". 오리지널 캐릭터를 SVG로 설계해 `InfoCard`에 적용(`src/Character.tsx`: 노란 얼굴, 눈 깜빡임·통통 튀기·장면별 팔 제스처, 음성 크기에 맞춘 입 움직임). 샌드박스에서 35초 mp4 렌더링 후 출력 파일에서 프레임을 뽑아 눈으로 확인. 합성 테스트 음성으로 입 연동 경로 동작 확인. 실제 한국어 음성·사용자 평가는 확인 전
- 2026-11-07 밤: 사용자 지적 — 애니메이션 형태를 먼저 물었는데 MPT를 우선으로 잡은 것은 잘못. **방향 수정: 애니메이션 정보카드(Remotion `InfoCard`)를 주력, MPT 스톡영상은 보조.** 근거: 정보카드형 주제는 스톡 매칭 문제(연관성)가 없음. `src/cards.json`(장면 JSON)으로 대본 N개→영상 N개 구조. 샌드박스에서 35초 mp4 렌더링·프레임 눈으로 확인(한글 정상, 음성 없음). 음성은 `scripts/tts.py`(edge-tts, 샌드박스는 인터넷 차단으로 실행 못 함, 문법만 확인). 사용자 PC·Colab 실행 확인 전
- 2026-11-07 밤: 사용자 평가 — 후킹 없음, 영상과 내용 연관성 낮음, 허접함. 원인: 주제만 넘겨 무료 LLM이 대본·검색어를 자동 생성함(사용자의 infomed-shorts-script 스킬 미사용). MPT는 `video_script`·`video_terms`를 직접 받으면 그대로 사용(코드 확인) → 셀을 대본·영어 키워드 직접 입력 방식으로 변경, `sequential`(순서대로 배치)·클립 6초 적용. Colab 실행·결과 확인 전
- 리모션·하이퍼프레임·모션그래픽은 MPT 영상에 아직 연결되지 않음(별도 샘플만 존재)
- 2026-11-07: 올인원 셀 Colab 실행 성공(1/4~4/4 통과, 폰트 NanumGothicBold 적용 로그 확인, 최종 렌더 약 5분, 드라이브 shorts_output에 21MB mp4 저장 확인). 영상 속 한글 자막 표시 여부는 사용자 확인 전
- 2026-11-07: 매일 반복 설정을 없애려고 올인원 셀 작성(보안 비밀로 키 읽기). Colab 실행 확인 전
- 2026-11-07: 드라이브 영상 확인 결과 한글 자막 미표시. 원인(번들 폰트 전부 한글 미지원)과 수정 셀 정리, 수정 후 실행은 확인 전
- 2026-11-07: 리모션 템플릿(Shorts, Captioned) 제작·샌드박스 전체 렌더링 확인. MoneyPrinterTurbo 결과 영상의 자막·폰트 확인은 아직 전
- 2026-11-06: GitHub 계정을 `lddlhjlyj-byte`로 전환, 포크 생성, Colab 일괄 생성 셀로 영상 1개 생성해 드라이브 저장까지 확인
- 2026-11-09: InfoCard(shorts-video/)와 워크플로 `.github/workflows/infocard.yml`을 포크에 추가. GitHub Actions 수동 실행 1회 성공(약 2분 30초): edge-tts 음성 8장면 생성(장면 길이 3.5~8초, 총 49.5초=1485프레임), Remotion 렌더링 성공, 산출물 6.0MB(Artifacts의 `infocard`). 샌드박스에서는 산출물 다운로드가 막혀 영상·음성 품질·한글 폰트는 아직 눈/귀로 확인 못 함. 실행 방법: Actions 탭 → infocard-video → Run workflow
- 2026-11-09: 워크플로가 실행 후 장면 사진 10장+probe를 저장소 verify/ 폴더에 자동 커밋하도록 변경(권한 contents: write). 2차 실행 성공: 1080x1920, h264+aac, 49.5초. verify 사진으로 한글 정상 렌더링 확인, 캐릭터 입 모양이 장면마다 다르게 나옴. 실제 음질·싱크는 귀로 확인 전. audio.txt(음량)는 로그 레벨 문제로 빈 파일
