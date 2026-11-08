# 쇼츠 자동 생성 템플릿 (Remotion, 1080x1920)

1. 스톡 영상(mp4)을 `public/clips/` 에 넣는다.
2. `src/script.json` 에서 줄마다 text / clip / seconds 를 수정한다. (한 줄 15~20자, 줄바꿈은 \n)
3. 미리보기: `npm run dev`
4. 렌더링: `npm run render` → `out/shorts.mp4`

## 기존 영상에 자막만 입히기 (Captioned)
1. 영상을 `public/input.mp4` 로 넣는다.
2. 자막 만들기 (택1)
   - 자동(무료, 로컬 Whisper): `npm run transcribe` → `public/captions.json` (첫 실행 시 whisper 설치/모델 다운로드, make·cmake 필요)
   - 이미 있는 .srt: `public/` 에 넣고 `src/Root.tsx` 의 `captions` 값을 파일명으로 바꾼다.
3. 미리보기 `npm run dev` → Captioned 선택 / 렌더링 `npm run render:captioned` → `out/captioned.mp4`

## 애니메이션 정보카드 쇼츠 (InfoCard) — 주력
1. `src/cards.json` 에 장면(hook/title/item/summary/outro)과 문구를 쓴다.
2. 음성: `pip install edge-tts` 후 `python scripts/tts.py` (장면 길이가 음성에 맞게 자동 조정됨)
3. 미리보기 `npm run dev` → InfoCard / 렌더링 `npm run render:card` → `out/infocard.mp4`

## 캐릭터 (src/Character.tsx)
- 머리만 큰 마스코트: 몸통 없음, 짧은 팔·다리, 눈썹·코 없음, 눈 2개 면적 합 ≈ 얼굴의 1/3
- 눈 깜빡임, 통통 튀기, 장면별 팔 제스처(hook 만세 / item 가리키기 / summary 세기 / outro 손 흔들기)
- 음성 없을 때: 가짜 입 모양 / `scripts/tts.py` 로 음성을 만들면 실제 소리 크기에 맞춰 입이 움직임
- 색·표정 수정: Character.tsx 맨 위 SKIN, LINE 값
