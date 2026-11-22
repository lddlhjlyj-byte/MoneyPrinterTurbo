# 작업 규칙

- 세션을 시작하면 먼저 `NOTES.md`를 읽고 그 상태에서 이어서 작업한다. 다시 묻지 않는다.
- 작업 단위(설정 확정, 오류 해결, 영상 생성 성공 등)가 끝날 때마다 `NOTES.md`의 "진행 기록"과 해당 항목을 갱신해 커밋·푸시한다. 세션 종료 시점에 몰아서 하지 않는다.
- `NOTES.md`에는 확인된 사실만 적는다. 추측, API 키는 적지 않는다.
- 사용자는 코딩 초보다. 과정 설명은 줄이고, 결과와 다음 할 일 위주로 짧게 답한다. 확인하지 못한 것은 확인하지 못했다고 말한다. 존댓말을 쓴다.
- 영상 생성 설정(음성, 영상 소스, 클립 길이, 자막 위치)은 항상 코드에서 명시한다. 빠뜨리면 기본값으로 돌아 실패한다. (MPT 스톡 경로 한정, 주력은 아래 InfoCard)

## 현재 구조 (2026-11-17 기준)
- 주력: Remotion `shorts-video/`의 InfoCard(마스코트 애니메이션 정보카드) → GitHub Actions(`infocard.yml`)가 렌더링 → `content/videos/<name>.mp4`, `content/thumbnails/<name>.png` 보관
- 보조: MoneyPrinterTurbo(스톡영상, Colab). 스톡 매칭 규칙(시각적 명사/동사, 한 줄 15~20자)은 이 경로에서만 쓴다
- 자동 제작: `daily-shorts.yml` 월·수·금 06:30 KST(2026-11-23부터 예정이나, 2026-11-19 사용자 지시로 `pipeline/auto/PAUSE` 파일이 있어 지금은 생성하지 않음. 사용자가 재개를 지시하면 PAUSE 삭제). 주제 선정→대본→검사→렌더링→`content/queue.json` 기록. LLM은 OpenRouter 무료 라우터(`OPENROUTER_API_KEY` Secret)
- 업로드: 유튜브 직접 업로드(`pipeline/auto/upload_youtube.py`, Secret `YT_CLIENT_ID`·`YT_CLIENT_SECRET`·`YT_REFRESH_TOKEN`). 업로더는 `content/queue.json`의 대기 항목만 처리하므로, 사용자 대본 영상도 queue에 항목(publishAt 포함)을 넣어야 올라간다. Metricool은 월 20개 한도(무료) 때문에 쓰지 않는다
- 틱톡: 당분간 사용자가 직접 업로드(파일은 `content/videos/`). 릴스는 미구성

## 영상 연출 규칙 (사용자 요청, 반드시 지킨다)
- 장면 내용에 맞춰 캐릭터의 움직임(`move`·`gesture`)과 표정(`mood`)을 장면마다 다르게 지정한다. 같은 동작을 영상마다·장면마다 반복하지 않는다
- 표정 5종 구현됨: `happy`·`sad`·`angry`·`shine`·`teary`(미지정=기본, 기존 `surprised`·땀방울 별도). 윙크는 사용하지 않는다. 자동 제작(`generate.py`)은 move·gesture·mood를 장면 내용·직전 영상과 겹치지 않게 자동 지정한다(2026-11-17 연결, 가짜 LLM 응답으로만 시험)
- `move`는 기존 10개 외에 `shorts-video/src/motions.ts`의 사람 동작 100개(MOTIONS 키)도 쓸 수 있다. 자동 제작은 장면 글 키워드로 어울리는 동작을 고른다(2026-11-18)
- 시청 유지(사용자 요구, 평균 시청 지속률 70%↑): 대본은 문장 15~22자로 짧게 끊고 2~3초마다 새 정보·숫자를 넣는다(`gpt-prompt.md`·`rules.py`). 렌더링은 비트 자막·펀치 줌·효과음(`Beats.tsx`)을 쓴다. 이 레이어를 끄거나 줄이지 않는다
- 장면 내용과 연관된 그림(`icon`·`kind`·`deco`)을 쓴다. item 아이콘 13종: faucet 세안·cream 보습·bottle 제품병·humidifier·patch·heater 열감·mirror 거울·pimple 트러블 얼굴·calendar 날짜·hand 손·stop 금지·clinic 병원·document 서류. 내용과 안 맞는 아이콘은 쓰지 말고 새로 추가한다(`Icons.tsx`·`InfoCard.tsx`·`pipeline/schema.py` 세 곳)
- 대본과 캐릭터가 따로 놀지 않게 한다(2026-11-23 사용자 지시): 장면마다 `mood`·`move`·`gesture`·`icon`을 그 장면 대사의 감정·내용에 맞춘다. 걱정·문제 대사에 웃는 표정(shine·happy), 즐거운 대사에 슬픈 표정을 쓰지 않는다. hook에도 `mood`를 지정한다. 렌더링 후 장면 사진에서 대사와 표정이 맞는지 직접 확인하고 NOTES.md에 적는다
- 이시연 등 가상 인물 이야기에서 화면의 '가상 사례' 글자는 사용자 지시로 넣지 않는다(hook `warn`은 빈 문자열)
- 지정한 동작과 표정은 NOTES.md의 해당 영상 기록에 남긴다
- 영상마다 `src/cards.json` 최상단에 고유한 영문 `name`(파일명)과 유튜브 `title`을 넣는다. 같은 `name`을 재사용하면 보관 파일이 덮어써진다

## 대본 규칙
- 사용자가 대본을 주면 문구를 바꾸지 않는다. 길이·금지어·글자 수 문제는 알리기만 하고 `rules.py`를 적용하지 않는다. 제목·해시태그가 없으면 만들되 만들었다고 기록한다
- 자동 제작 대본에는 `rules.py` 검사를 적용한다(숫자 규칙: hook·모든 item에 구체적 숫자 필수, `facts` 출처/미확인 목록 필수). 영상 목표 길이는 25~40초(상위 영상 분석 기준)
- 의학·화장품 효능 문구는 출처 확인 여부를 NOTES.md에 적는다(미확인이면 "미확인"). 단정 표현은 피한다

## 업로드·예약 규칙
- 공개 예약 시각은 기본 18:30 KST(`pipeline/auto/config.json`의 `publish_hour_kst`·`publish_minute_kst`). 사용자가 시각을 지정하면 그 값을 쓴다
- 세션을 시작하면 사용자 요청보다 먼저 `content/queue.json`을 확인해, 상태가 `rendered`(또는 영상 파일이 있는 `generated`)인 항목을 위 시각(지났으면 다음 날)으로 예약하고 상태를 갱신해 커밋·푸시한다. 예약 전에 영상·썸네일 파일과 `rules.py` 검사를 확인한다. 사용자에게 날짜를 되묻지 않는다
- 사용자 요구: 주제 선정부터 렌더링·업로드까지 Claude가 알아서 하는 시스템. 수동 단계(붙여넣기·화면 확인 요청)를 사용자에게 넘기지 않는다

## 검증 규칙
- 렌더링 후 `pipeline/verify_video.py`(infocard.yml에서 자동 실행)가 소리·길이·장면 타이밍을 측정한다. 실패하면 업로드 전에 워크플로가 멈추고, 결과는 `verify/report.txt`. 이 검사는 발음·자막 내용·눈으로 보는 품질은 확인하지 못하므로 "통과"를 "완벽"으로 보고하지 않는다
- "성공"은 확인한 것만 쓴다. 정지 프레임만 본 경우 음성 싱크·전체 재생은 "확인 전"으로 적는다
- 외부 서비스 호출(LLM, 업로드 등)은 가짜 응답 시험만으로 완료 보고하지 않는다. 실제 호출 결과를 확인하기 전에는 "미확인"으로 적는다

## 폴더 구조 (2026-11-21, 사용자 요청)
- 영상 1개 = `projects/<name>/` 1개. 9단계: 01_research 조사 · 02_topic 주제선정 · 03_plan 기획서 · 04_script 스크립트 · 05_narration 대본 · 06_voice 음성·자막 · 07_video 소스·합성 영상 · 08_verify 검증 · 09_publish 게시. 설명은 `pipeline/README.md`
- 새 영상은 `python3 pipeline/project.py new <name>` → 01~03 작성 → `from-cards` → 렌더링 → `sync`. `status.json`의 done은 직접 확인한 단계만, 자동 측정은 auto로 둔다
- 08_verify의 음성 오독·라이선스는 자동 확인이 안 되므로 pending/미확인으로 두고 "검증 완료"라고 보고하지 않는다
- 렌더링 전 형식 게이트: `pipeline/schema.py`가 move·mood·gesture·icon·kind·deco 허용값의 단일 출처이고, `infocard.yml`이 `validate_cards.py --schema-only`로 틀린 값을 막는다(문구는 검사하지 않음). 동작 이름(deepBreath 등)은 `move`, 표정(happy 등 6종)은 `mood`에 넣는다
- 기존 영상은 `python3 pipeline/project.py backfill all`로 git 이력의 cards.json에서 `projects/`를 채운다(2026-11-21 수행). `shorts-video/src/cards.<name>.json` 보관본은 새로 만들지 않는다(원본은 `projects/<name>/04_script/cards.json`)

## 문맥점검 (2026-11-22, 사용자 지시: 각 세션마다 반드시 기록)
- 매 세션마다, 그리고 대본·화면 글자·제목을 쓰거나 고칠 때마다 문맥점검을 한다: ①실제 일상 대화에서 쓰는 말인지(예: "취업 사진 D-7"·"취업 사진 찍기"는 부자연스러움 → "증명사진 찍기 일주일 전") ②전문용어·약어·숫자 표기가 처음 보는 사람에게 바로 이해되는지 ③앞뒤 장면과 이야기·인물·수치가 맞는지 ④의학·효능 문구가 출처 확인 항목만인지
- 점검만 하고 끝내지 않는다. 문제가 있으면 반드시 수정한다: 일상 용어로 바꾸고, 말하듯 자연스러운 대화체로 쓰고, 앞뒤 문장의 뉘앙스(말투·감정·흐름)가 이어지도록 고친다. 예) 소개하는 말투 뒤에 갑자기 딱딱한 문어체가 오지 않게, 문장 사이 연결어·어미를 맞춘다
- 수정 전→후 문구와 이유를 그 세션의 NOTES.md 진행 기록에 반드시 적는다(고친 것·그대로 둔 것과 이유). 위 ①~④와 문구 전체(대사·화면 글자·제목·자막·해시태그)를 빠짐없이 점검하고 "미점검"으로 남기지 않는다. 렌더링 뒤에는 장면 사진을 직접 보고 화면 글자까지 점검한다
- 단, 사용자가 직접 준 대본은 문구를 바꾸지 않는다(대본 규칙 우선). 이 경우 문제 문구와 고칠 안을 알리기만 하고 사용자 결정을 받는다. Claude가 쓴 대본은 점검 후 바로 수정한다
- 렌더링 전에 점검 결과를 사용자에게 보여준다. 사용자가 요청하지 않으면 렌더링하지 않는다
