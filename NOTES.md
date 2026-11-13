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
- 2026-11-09: 사용자 피드백 반영(흰 가운 캐릭터, 대본 전면 개정: Q10 지용성 원리 장면 추가·항응고제/스타틴 상담, 후킹 '공복에 Q10? 흡수가 떨어집니다', 장면별 동작: 점프해 자막 끌어내림/솟아오름/회전/쿵/땅으로 꺼짐). 의학 내용은 일부만 출처 확인(지용성·식사와 흡수는 리뷰 논문 제목만 확인, 와파린 상호작용은 PubMed 초록 직접 열람 실패 → 게시 전 확인 필요)
- 2026-11-09: 개정판 Actions 실행 성공(run 42543670615): 한국어 음성 포함 78.5초(1080x1920, h264+aac). 장면별 음성 길이: hook 8, why 8.5, title 4.5, item 8/9.5/8/14.5, summary 10.5, outro 7초 → 쇼츠로는 긴 편(항목4·요약 단축 필요). verify 사진으로 한글·가운·장면 배치 확인, 입 모양은 실제 음성에 맞춰 열림/닫힘이 달라짐. 목소리·움직임 느낌은 사용자 확인 전
- 2026-11-09: 사용자 피드백(음성·움직임 좋음) → 팔을 머리 옆에서 가운 옆구리로 이동, 팔 올림 각도 조정, 코믹 요소 추가(착지 별 폭발, 불안 장면 땀방울). 결과 영상은 video 브랜치 infocard.mp4(raw 링크)로 받음. 코믹 방향은 사용자에게 문제없다고 답함, 추가 요소(표정 변화 등)는 반응 보고 결정
- 2026-11-09: 방향 확정(사용자 진술): 채널 주제는 최신 의료 시술·화장품 사용방법. 코큐텐 영상은 테스트용. 유튜브 채널 생성 중(고급 기능 접근은 '기록 쌓기' 선택 권유), 기존 테스트 쇼츠는 비공개 처리. 정책 확인 사항: 템플릿형 대량 생산·건강 조언 AI 페르소나는 수익 창출 제외 위험, 신규 YPP 기준은 2027-02-01부터 상향(8,000시간 또는 쇼츠 2,000만 조회, 구독 1,000). 병원 계정이면 의료광고 규정 확인 필요
- 2026-11-09: 수분앰플 대본 1호(content/ampoule-01.md)를 InfoCard 장면(hook/why/title/item×4/summary/outro)으로 변환해 src/cards.json에 적용(코큐텐판은 cards.q10.json 보관). 병 아이콘(why kind=bottle), 밝은 마무리 동작(item worry:false) 추가. 의학 근거는 뷰티 매체 수준만 확인(게시 전 확인 필요)
- 2026-11-09: 채널 프로필(800x800)·배너(2560x1440) 초안 제작(content/channel/, Remotion Still: Profile/Banner). 채널명 후보 '노랑이 스킨랩'(미확정). 유튜브 계정 유형(브랜드/개인) 확인은 Studio 설정>권한 화면으로. 배너 규격은 블로그 기준(공식 문서 미확인): 권장 2560x1440, 최소 2048x1152, 안전 영역 1235x338, 6MB 이하
- 2026-11-09: 유튜브 채널 설정 완료(이름 '노랑이 스킨랩', 핸들 @noranglab, 프로필·배너 적용, 설명란 문구 적용). 첫 영상(수분앰플 4단계, 66초)을 2026-11-10 18:00 KST 예약 업로드로 설정(사용자 진술). 제목: '앰플 바르는 순서 4단계 (물기, 얇게, 누르기, 크림)'. 연령 제한 없음, 카드·최종 화면 미설정. 업로드 후 24~48시간 뒤 반응 확인 예정. 의학 근거는 뷰티 매체 수준(미확정)
- 2026-11-10: 세션 정리. 다음 할 일: ①첫 영상(수분앰플) 11-10 18:00 예약 업로드 결과 확인 ②두 번째 영상 주제 '선크림 제대로 바르는 법' 후보(근거로 AAD 공식 페이지 확인 필요 — 이 환경에서 aad.org fetch는 차단되어 못 읽음, 검색 결과만 확인) ③두 번째 영상으로 Metricool 예약 시험(무료 플랜 월 20개 게시, 쇼츠 예약은 도움말상 가능, 커넥터로 예약 게시가 되는지·URL로 영상 첨부가 되는지는 미확인, 시험 전 사용자 허락 필요) ④InfoCard 코믹 요소 추가 여부는 사용자 반응 후 결정 ⑤Humanizer 계열 플러그인은 한국어 지원 미확인, 대본에 기준만 적용 예정. 현재 cards.json=수분앰플판, cards.q10.json=코큐텐판
- 2026-11-10: 영상 2(선크림)를 사용자가 붙여준 대본(UVA/UVB, SPF30·PA+++, 15분 전·2시간마다, 실내·흐린 날)으로 cards.json에 적용(수분앰플판은 cards.ampoule.json 보관). 진행 막대를 항목 수에 맞게 동적화, why kind=sun 아이콘 추가. Actions 실행 성공(run 42714313742): 1080x1920, h264+aac, 58초, video 브랜치 infocard.mp4. 음성·움직임은 사용자 확인 전. 출처 미확인: PA+++ 이상, 창문 통과 UVA, UVA 광노화(게시 전 확인 필요). 확인된 것: SPF30+·15분 전·2시간마다·충분한 양(AAD/FDA/식약처)
- 2026-11-10: 렌더링 도구 검토: 현행 Remotion 유지. 대안 HyperFrames(HeyGen, Apache 2.0, HTML+GSAP, 단일 머신 렌더링)는 라이선스 부담이 생길 때 검토. Revideo는 라이선스·유지보수 미확인. 'Rhea'는 정체 미확인. HyperFrames 한글·품질은 직접 시험 전
- 2026-11-10: 사용자 확인 후 영상 2(선크림 58초) 최종본을 content/videos/sunscreen-01.mp4로 보관(video 브랜치는 다음 렌더링 때 덮어써짐). 영상 3 '선크림 세안' 대본(사용자 제공: 워터프루프→오일·밤, 일반→순한 세안, 과한 세안 주의)을 cards.json에 적용(영상2판은 cards.sunscreen.json), 마무리 문구 '인포뷰티'→'노랑이 스킨랩'으로 변경. Actions 렌더링 예정. 출처 미확인: 워터프루프는 오일·밤 권장, 일반 선크림은 순한 세안 충분, 과한 세안·피부 장벽(게시 전 확인 필요). 참고: FDA는 'waterproof' 표기를 쓰지 않고 'water resistant'로 안내(AAD 확인)
- 2026-11-10: 메트리쿨 연결 유튜브 채널 ID UChZyHxpFMZcybO0AYRlkVfQ가 '노랑이 스킨랩'인지 미확인(사용자가 스튜디오 채널 ID 확인 예정). 확인 전 게시 안 함
- 2026-11-10: 포크 저장소의 Actions가 비활성화됨(워크플로 실행 시 422 'Actions has been disabled'). 샌드박스에서는 활성화 불가(프록시 차단) → 사용자가 GitHub Settings > Actions > General에서 켜야 영상 3 렌더링 가능. 원인은 미확인
- 2026-11-11: 사용자가 Settings > Actions > General에서 Actions를 켬(사용자 진술). infocard.yml에 push 트리거 추가(shorts-video/src/cards.json 또는 워크플로 파일 변경 시 main 푸시로 자동 렌더링). 푸시 완료, 영상 3(선크림 세안) 렌더링 시작 여부·결과는 이 환경에서 Actions API가 막혀 확인 못 함 → 사용자가 Actions 탭에서 확인. 대본의 '워터프루프' 내레이션은 FDA 표기(water resistant)와 달라 변경 여부 사용자 답변 대기
- 2026-11-11: 사용자 결정(진술): 영상 3 내레이션의 '워터프루프' 표기는 그대로 유지(FDA는 water resistant 표기 안내). 대본 수정 없음
- 2026-11-11: 영상 3(선크림 세안) 렌더링 성공(52초, 1080x1920, h264+aac; 실패 원인은 영상보다 긴 시각의 확인용 사진 추출로 추정, 수정 후 성공). 영상은 content/videos/sunscreen-02-cleansing.mp4로 보관. 썸네일: Remotion Still `Thumbnail`(1080x1920, cards.json 후킹 문구 사용)을 추가해 content/thumbnails/sunscreen-02-cleansing.png 생성(출력 이미지 눈으로 확인). 명령: `cd shorts-video && npx remotion still Thumbnail ../content/thumbnails/<이름>.png`. Metricool 쇼츠 썸네일 지정은 인증 채널·쇼츠 썸네일 허용 계정만 가능(도구 설명 기준, 시험 전). 예약 업로드(날짜·시간)는 사용자 답변 대기. 유튜브 자동 업로드는 아직 연결 안 됨(렌더링까지만 자동)
- 2026-11-11 20:07: 사용자 지정(진술) 채널 ID UChZyHxpFMZcybO0AYRlkVfQ = Metricool 연결 채널과 일치. 영상 3을 Metricool로 2026-11-11 20:10 KST 공개 쇼츠 예약(post id 424283655, 상태 PENDING). 영상·썸네일 URL(GitHub raw)이 Metricool 저장소로 수집된 것은 응답에서 확인. 실제 유튜브 게시·썸네일 적용 여부는 20:10 이후 확인 전. 제목 '선크림, 제대로 지우고 계신가요? (워터프루프 클렌징)', AI 생성 표시 켬, 아동용 아님
- 2026-11-11 밤: 사용자 요청 4가지 반영(겨울 피부 건조 대본으로 영상 4 제작). ① 동작 다양화: choreo.ts에 shiver/tilt/sway/hop3/nod 추가, 장면별 `move`(run/rise/spinJump/tremble/bounce/shiver/tilt/sway/hop3/nod)와 `gesture`(both/cheer/shy 추가) 지정 가능. ② 장면 연관 그림: Icons.tsx 신규(눈송이·난방기·갈라진 피부·수도꼭지·보습제·가습기·잔주름/들뜸/당김, 눈 내리는 배경 `deco:"snow"`), item 장면 `icon`, why 장면 `kind:"winter"`, 새 장면 `signs`. ③ 파일명: cards.json 최상단 `name`(영문 짧은 이름)·`title`(유튜브 제목)을 두고, 워크플로가 content/videos/<name>.mp4, content/thumbnails/<name>.png로 자동 보관(덮어쓰기 방지), 푸시 전 git pull --rebase 추가. 선크림 세안판은 cards.sunscreen-cleansing.json로 보관. ④ 확인: 샌드박스에서 장면별 정지 화면 10장을 눈으로 확인(글자 넘침·겹침 없음, 아이콘 표시 정상). 움직임(애니메이션)과 음성 싱크는 영상 전체를 재생해 보지 못했고 사용자 확인 전. 의학 문구는 사용자 제공 대본 그대로(출처 확인 안 함)
- 2026-11-11 21:50: 사용자 요구(필수 기록) — 장면 내용에 맞춰 캐릭터의 움직임과 표정을 바꾼다. 영상 4(winter-dry-skin) 장면별 지정: hook=기본 점프·자막 끌어내림(+눈), why=move shiver·gesture shy(+눈), signs=move tilt·gesture pointR, title=기본 쾅 내리꽂기, item1 수도꼭지=hop3·both, item2 보습제=sway·both, item3 성분=spinJump·pointL, item4 가습기=rise·cheer, summary=기본 4번 점프(count), outro=기본 점프·회전(wave, +눈). 표정은 아직 장면별로 바꾸지 못함(구현된 것은 hook의 놀람 표정·땀방울·입 모양뿐) → 표정 변형 추가는 미구현 상태
- 2026-11-11 21:50: 영상 4 푸시(21:33) 후 17분이 지나도 Actions의 결과 커밋이 main에 없음 → 실행이 실패했을 가능성 높음(실행 상태는 이 환경에서 확인 불가). 추정 원인: 새로 추가한 `git pull --rebase`가 tts.py가 수정한 cards.json(미커밋 변경) 때문에 거부됨. `--autostash`로 수정해 재푸시(추정이며 사용자가 Actions 화면으로 확인해야 함)
- 2026-11-12: 역할 분리 파이프라인 도입(pipeline/README.md, pipeline/roles/1~5, 영상별 기록 content/briefs/<name>.md). 영상 4 후킹을 "겨울 거울 앞, 잔주름 더 보이나요? / 챙길 건 4가지뿐"으로 교체(사용자 지적: 후킹·스크립트 약함). 별도 에이전트 검수 결과 반영(글자 한도 4건 수정, 단정 문구 완화, 요약 음성 수정, 제스처 중복 변경). 미반영: 후킹 화면에 거울 그림 없음, 장면별 표정 변형 미구현. 예약: 2026-11-13 15:00 KST 사용자 지정, 최종 렌더링 확인 후 Metricool로 예약 예정(예약 전)
- 2026-11-12: 1차 재렌더링 65초(후킹 장면 7초 이상, 요약 12초 → 늘어짐). 후킹을 한 문장(약 3~4초)으로 줄이고 요약 음성을 단축해 재푸시. 2차 길이·화면은 확인 전
- 2026-11-12 09:37: winter-dry-skin 2차 렌더링 60.5초 확인 후 2026-11-13 15:00 KST 공개 쇼츠 예약(Metricool post id 425127626, PENDING). 제목 '겨울만 되면 피부가 갑자기 늙어 보이는 이유'. 게시 여부는 11-13 15시 이후 getScheduledPosts로 확인 예정(예약 상태는 이 환경에서 11-13 이후 확인 필요)
- 2026-11-12: 지피티용 지시문 pipeline/gpt-prompt.md 추가(지피티가 cards.json 형식으로 대본 출력). GPT→자동 수신은 불가(API는 유료, 공유 링크 읽기는 미시험)이므로 붙여넣기 방식. 지시문대로 지피티가 실제로 올바른 JSON을 내는지는 시험 전
- 2026-11-12: 영상 5(salmon-repair-cream-guide) — 사용자가 지피티에서 받은 cards.json을 붙여넣음. Claude가 title 중복 표기·글자 한도 4건·아이콘 불일치 교정, patch(패치 테스트) 아이콘 추가, 동작 지정(item: nod/run/tilt/tremble), 별도 에이전트 검수. 미반영: 후킹 그림 없음, '재생' 표현 표시광고 위험(확인 불가). 예약 날짜 미정
- 2026-11-12: salmon-repair-cream-guide 렌더링 성공(46초, 1080x1920). 장면 사진 10장 확인(글자 넘침·겹침 없음). 영상 전체 재생·음성 싱크는 미확인. 예약은 날짜 답변 대기(예약 전)
- 2026-11-12 16시: 자동 제작 시스템 구축(사용자 요구: 주제 선정부터 렌더링·업로드까지 Claude가 알아서). 구성: pipeline/auto/{config.json, rules.py(글자 수·금지어·구조 검사), generate.py(주제 선정→대본→검사→LLM 검수→연출 지정→저장), topics.json(후보 30개·사용 기록), upload_youtube.py(비공개+예약 공개 업로드, 자격 정보 없으면 queue에 rendered 대기), SETUP.md}, .github/workflows/daily-shorts.yml(매일 06:30 KST), infocard.yml에 업로드 단계 추가. 시험 결과: rules.py·generate.py를 가짜 LLM 응답으로 시험해 통과(정상 케이스 생성·불량 케이스 3회 실패 후 중단), 업로드 스크립트의 '자격 없음' 대기 경로 시험 통과. 미확인: GitHub Models 호출(models.github.ai, 모델명 openai/gpt-4.1)이 실제로 되는지, Actions에서 끝까지 도는지, YouTube API 업로드(심사 전 비공개 고정 가능성). 의료 주장 출처 확인 없음

- 2026-11-12: winter-dry-skin 예약을 11/13 15:00 → 11/12 16:22 KST로 변경(사용자 요청). Metricool post id 425127626 → 425343665, 상태 PENDING. 실제 게시·썸네일 표시는 미확인.
- 2026-11-13: 영상 7 toner-timing-guide 제작(사용자 요청: 조회수 상위 분석 반영한 스킨토너 사용법). 분석(vidIQ, 같은 주제 한국 쇼츠 약 29개): 상위는 13~45초·제목에 답을 숨김·첫 3초 후킹, 노랑이는 53~67초·답 나열 제목·좋아요율 약 0.16%(표본 3개, 업로드 직후라 방향만 참고). 반영: 7장면(후킹·제목·항목3·요약·마무리) 음성 약 245자(목표 25~40초), 제목 "토너, 바르는 타이밍 놓치고 계신가요?". 근거(확인): 세안 후 젖은 피부에·손 또는 화장솜·T존부터 눈가 입술 제외·아침저녁(CeraVe, Dermstore 페이지). 간접 근거: "3분 안"은 보습 기준(Cleveland Clinic·GQ Korea)을 토너에 적용 → 게시 전 확인 필요. 미확인: 토너 사용량, 손 vs 화장솜 낭비 차이. 동작 지정: hook 기본(놀람 표정)·title 기본 up·item1 run+pointR(faucet)·item2 tilt+both(bottle)·item3 bounce+cheer(cream)·summary sway·outro hop3+wave. 표정 변형은 미구현. 별도 에이전트 검수 4건 반영. 이전판은 cards.winter-numbers-routine.json로 보관. 렌더링·예약은 푸시 후 기록
- 2026-11-13: toner-timing-guide 렌더링 성공(43.5초, 1080x1920, h264+aac, 8.3MB). 영상에서 직접 뽑은 장면 8장으로 한글·글자 넘침·그림(수도꼭지/병/크림) 확인, 음성 싱크·움직임은 전체 재생 확인 전. 영상 content/videos/toner-timing-guide.mp4, 썸네일 content/thumbnails/toner-timing-guide.png. 예약 게시 전(사용자 답변 대기, 후보: 오늘 18:00 KST)
- 2026-11-13: 영상 8 toner-correct-use 제작(사용자가 GPT 분석 대본 제공, 이 대본으로 재제작 요청). GPT 대본의 '반드시·무조건'은 금지어라 표현 변경, 제목은 '스킨토너, 이렇게 바르면 피부에 자극될 수 있어요'로 단정 완화. 4항목(손/화장솜/적당량/보습제), 음성 약 340자. 동작 지정: hook 기본(놀람)·title 기본 up·item1 nod+pointL(bottle)·item2 spinJump+both(patch)·item3 tremble+shy(faucet)·item4 rise+cheer(cream)·summary·outro 기본. 표정 변형 미구현. 근거 미확인: 여러 겹 바르면 보습이 더 좋지 않다·화장솜 반복 문지름 자극(GPT 주장, 완화 표현 사용) → 게시 전 확인 필요. 별도 에이전트 검수 3건 반영. 이전판 cards.toner-timing-guide.json 보관. 렌더링 결과는 푸시 후 기록
- 2026-11-13: toner-correct-use 렌더링 성공(56.5초, 1080x1920, h264+aac, 10.3MB; 요약 음성 중복 표현 수정 후 재렌더링). 영상에서 직접 뽑은 장면 8장으로 한글·글자 넘침·그림(병/솜 패치/수도꼭지) 확인, 항목 4·마무리 장면과 음성 싱크는 확인 전. 길이는 상위 영상 분석 목표(25~40초)보다 16초 이상 김. 영상 content/videos/toner-correct-use.mp4, 썸네일 content/thumbnails/toner-correct-use.png. 예약 게시 전
- 2026-11-13: 사용자 지시(문구 임의 수정 금지, GPT 대본 그대로)로 toner-correct-use 재제작. 이전에 Claude가 문구를 바꾼 판은 cards.toner-correct-use-edited.json로 보관. 이후 사용자가 대본을 제공하면 문구를 바꾸지 않는다(길이·금지어 문제는 알리기만). GPT 원문은 글자 한도 초과·금지어 포함이라 rules.py 미적용. 렌더링 결과는 푸시 후 기록
- 2026-11-13: GPT 대본 문구 그대로 만든 toner-correct-use 렌더링 성공(72.0초, 1080x1920, h264+aac, 13.0MB). 영상에서 직접 뽑은 장면 8장으로 한글·글자 넘침·그림 확인(장면 2 '토너의 역할은'·장면 5 긴 문구는 글자가 작게 표시됨). 음성 싱크·전체 재생은 확인 전. 길이는 분석상 상위 영상 25~40초보다 훨씬 김(문구 불변 지시로 줄이지 않음). 예약 게시 전
- 2026-11-13: 사용자 지시: '오히려 피부에 자극됩니다' 제목 사용 가능(유지). 마무리 문장 '피부관리, 제대로 알고 시작하세요.'는 지적하는 느낌이라 '스킨토너, 모든 화장의 시작입니다.'로 교체(사용자가 제시한 표현 중 선택, 다른 후보: '스킨토너 제대로 사용하는 분이 더욱 좋은 효과를 느낄 수 있습니다.'). 그 외 문구는 GPT 원문 그대로. 재렌더링 후 결과 기록
