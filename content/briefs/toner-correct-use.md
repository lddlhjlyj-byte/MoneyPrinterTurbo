# toner-correct-use (사용자 지시: GPT 대본 문구를 하나도 바꾸지 않음)
- 2026-11-13 사용자 지시 "니 마음대로 문구 수정하지말고 그냥 보내준대로" → GPT 대본의 음성·제목·화면 문구를 그대로 사용. 이전 수정판은 cards.toner-correct-use-edited.json에 보관.
- 음성: GPT narration 7개 + ending 그대로(맞춤법·띄어쓰기 포함). 마지막 장면 음성 = narration 7 + ending
- 화면 글자: GPT caption 그대로(장면 1 caption은 두 줄로 나눔만 함). 제목·해시태그도 GPT 원문
- 코드 보정(문구 불변): 긴 화면 글자는 글자 크기 자동 축소, 비어 있는 경고 배너 숨김
- 규칙 검사(rules.py): 이번 영상은 적용하지 않음(GPT 원문은 글자 한도 초과, 금지어 '반드시'·'무조건' 포함). 자동 제작 시스템과는 별개로 사용자 지시 우선
- 위험(사용자에게 알림): '반드시', '무조건', '오히려 ... 자극됩니다' 단정 표현은 건강·의료 정보 단정 위험. 근거(여러 겹 바르면 보습이 좋아지지 않음 등)는 미확인
- 연출: hook 기본(놀람)·why sway+pointR(병)·item1 nod+pointL(병)·item2 spinJump+both(솜 패치)·item3 tremble+shy(수도꼭지)·item4 rise+cheer(크림)·outro hop3. 표정 변형 미구현
