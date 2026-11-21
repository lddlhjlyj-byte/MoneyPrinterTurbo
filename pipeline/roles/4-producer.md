# 제작자 (06_voice · 07_video · 09_publish)
담당 폴더: `projects/<slug>/06_voice`, `07_video`, `09_publish`. 렌더링 후 `python3 pipeline/project.py sync <slug>`로 기록한다(Actions가 자동 실행).
입력: 대본 + 스토리보드. 출력: `shorts-video/src/cards.json`, 렌더링된 영상, 썸네일, 유튜브 예약 업로드.
1. cards.json 맨 위에 고유 `name`(영문)과 유튜브 `title`을 넣는다. 원본은 `projects/<name>/04_script/cards.json`에 보관된다(`from-cards`).
2. `python3 pipeline/validate_cards.py shorts-video/src/cards.json --schema-only`로 move·mood·gesture·icon 값이 맞는지 확인한다(infocard.yml도 같은 검사를 하고, 틀리면 렌더링 전에 멈춘다). 동작 이름은 `move`에, 표정은 `mood`에 넣는다.
3. `content/queue.json`에 항목(name, title, description, tags, publishAt, status "generated")을 넣고 푸시하면 Actions(`infocard.yml`)가 렌더링하고 `upload_youtube.py`가 비공개+예약 공개로 올린다. 공개 시각은 사용자가 정하지 않았으면 기본 18:30 KST.
4. 렌더링이 끝나면 `verify/report.txt`, `verify/probe.txt`와 장면 사진을 확인한다. 길이가 40초를 넘으면 사용자에게 알린다(사용자 대본은 고치지 않음).
5. `content/queue.json`의 상태가 `uploaded`이고 `videoId`가 있는지 확인한다. 유튜브에서 실제로 예약 공개 상태인지는 이 환경에서 확인할 수 없으므로 "확인 전"으로 적는다.
6. Metricool은 월 20개 한도 때문에 쓰지 않는다.
