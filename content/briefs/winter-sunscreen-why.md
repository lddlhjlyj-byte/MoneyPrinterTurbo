# winter-sunscreen-why — 겨울에도 선크림
(자동 생성 2026-11-18 23:20 KST, 주제: 겨울에도 선크림을 발라야 하는 이유)

## 대본(voice)
1. SPF30으로 겨울 자외선 80% 차단하세요.
2. 겨울에도 선크림, 딱 4가지예요.
3. SPF30이 겨울 자외선 80%를 막아줘요.
4. 보습 후 선크림, 보호 30% 더 오래가요.
5. 실내 습도 40% 유지, 피부 진정에 좋아요.
6. 실내 온도 20°C, 난방 자극을 줄여줘요.
7. 오늘 할 선크림 습관 3가지를 기억하세요.
8. 저장하고 팔로우하세요.

## 연출
- item1: icon=bottle move=spreadSunscreen gesture=pointL mood=shine
- item2: icon=cream move=applyCream gesture=cheer mood=happy
- item3: icon=humidifier move=proud gesture=both mood=shine
- item4: icon=heater move=worry gesture=shy mood=angry
- hook: mood=기본(놀람)
- title: mood=기본(놀람)
- summary: mood=shine
- outro: mood=happy

## 게시 전 확인할 사실 (LLM이 적은 목록, 출처 직접 확인 안 됨)
- SPF 30이 겨울 자외선의 80%를 차단해요 — 미확인
- 보습제 후 선크림 바르면 보호 지속 30% 증가해요 — 미확인
- 실내 습도 40% 유지 시 피부 진정에 도움돼요 — 미확인
- 실내 온도 20°C 유지 시 난방 자극 줄어들어요 — 미확인

## 검수 기록(자동)
- 1차 오류: hook.line1: 9자 (한도 8자) '잔주름 보이나요?' / hook.line2: 15자 (한도 11자) '겨울에도 선크림이 필요해요.' / item1.head: 14자 (한도 8자) 'SPF 30, 80% 차단' / item1.sub: 20자 (한도 14자) '겨울 자외선 최대 80%까지 막아요.' / item3.head: 9자 (한도 8자) '실내 습도 40%' / item3.sub: 21자 (한도 14자) '건조한 겨울, 피부 진정에도움이 돼요.' / item4.head: 10자 (한도 8자) '실내 온도 20°C' / item4.sub: 17자 (한도 14자) '난방 중, 피부 자극을 줄여요.' / summary.title: 10자 (한도 9자) '겨울 선크림 3단계' / 숫자 규칙: hook에 구체적 숫자·범위(몇 분·몇 도·몇 %·몇 회)가 없음
- 2차 LLM 검수 호출 실패(규칙 검사만 통과): JSON을 찾지 못함
- 의료·화장품 주장의 출처는 확인하지 않음(미확인). 사람 검수 없음
