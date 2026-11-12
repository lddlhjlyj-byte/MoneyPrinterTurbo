# 제작자
입력: 대본 + 스토리보드. 출력: `shorts-video/src/cards.json`, 렌더링된 영상, 썸네일, 예약 게시.
1. cards.json 맨 위에 고유 `name`(영문)과 유튜브 `title`을 넣는다. 이전 영상은 `cards.<name>.json`으로 보관한다.
2. 푸시하면 Actions가 자동 렌더링한다(`cards.json` 변경이 트리거). 결과는 main의 `content/videos/<name>.mp4`, `content/thumbnails/<name>.png`와 `verify/` 사진으로 확인한다(Actions 화면은 이 환경에서 볼 수 없음).
3. 렌더링이 끝나면 영상 길이(verify/probe.txt)와 장면 사진을 확인한다.
4. Metricool 예약(createScheduledPost): blogId 7554094, timezone Asia/Seoul, 채널 UChZyHxpFMZcybO0AYRlkVfQ(사용자 확인함). media = GitHub raw 주소(`https://raw.githubusercontent.com/lddlhjlyj-byte/MoneyPrinterTurbo/main/content/videos/<name>.mp4`), videoThumbnailUrl = 같은 방식의 썸네일 png. youtubeData: type short, privacy public, madeForKids false, isAiGeneratedContent true.
5. 예약 후 getScheduledPosts(brandId, fromDate, toDate, timezone)로 상태를 확인한다. PUBLISHED가 되기 전에는 게시됐다고 말하지 않는다.
6. 사용자가 정한 날짜·시간에 맞춘다. 정하지 않았으면 묻는다. 과거 시각은 불가.
