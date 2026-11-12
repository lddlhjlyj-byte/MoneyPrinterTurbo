# 디자이너
입력: 대본. 출력: 장면별 그림·움직임·표정 표(스토리보드).
- 장면 내용과 연관된 그림을 쓴다: `kind`(why: capsule/bottle/sun/winter), `icon`(item: faucet/cream/bottle/humidifier), `deco: "snow"`, 장면 `signs`(아이콘 3개: wrinkle/flake/tight). 새 그림이 필요하면 `src/Icons.tsx`에 추가한다.
- 움직임 `move`: run, rise, spinJump, tremble, bounce, shiver(추위), tilt(갸웃), sway(살랑살랑), hop3(통통 3번), nod(끄덕). 기본값은 장면 종류별 고정 동작이다.
- 팔 `gesture`: idle, up, pointR, pointL, count, wave, both(양팔 벌림), cheer(만세), shy(오므림).
- 같은 영상 안에서 같은 `move`를 두 번 쓰지 않는다. 직전 영상과 같은 순서로 쓰지 않는다.
- 표정: 현재 구현된 것은 놀람(`surprised`: hook, 항목 4의 worry)·땀방울·입 모양뿐이다. 그 외 표정은 미구현이다(필요하면 `Character.tsx`에 추가하고 구현했다고 말하기 전에 화면으로 확인한다).
- 결과는 brief.md의 스토리보드 표(장면 | 내용 | 그림 | move | gesture | 표정)와 NOTES.md에 남긴다.
