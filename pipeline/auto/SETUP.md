# 자동 제작 시스템 설정 (한 번만)

## 전체 흐름 (사람 손 없이)
매일 06:30 KST `daily-shorts`가 실행됩니다.
1. 주제 선정: `pipeline/auto/topics.json`의 후보 중 계절에 맞는 1개를 무료 LLM이 고름
2. 대본 작성 → 코드가 글자 수·금지어·구조 검사 → 다른 LLM 호출로 검수 → 불량이면 최대 3번 다시 작성
3. 동작·제스처 자동 지정(직전 영상과 겹치지 않게), 파일명 자동 생성(`name`)
4. `infocard-video`가 자동 렌더링 → `content/videos/<name>.mp4`, 썸네일 보관
5. 업로드: 유튜브 자격 정보가 있으면 비공개+예약공개로 자동 업로드, 없으면 `content/queue.json`에 `rendered`로 대기 → Claude가 다음 대화 시작 때 Metricool로 예약

## 1. 바로 되는 것 (설정 없음)
- LLM: GitHub Models(무료, 저장소 토큰 사용). 실패하면 OpenRouter 무료 모델로 넘어갑니다.
- OpenRouter를 쓰려면: GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret → 이름 `OPENROUTER_API_KEY`, 값에 키 입력.
- 처음 시험: 저장소 → Actions → daily-shorts → Run workflow.

## 2. 완전 자동 업로드 (선택, 구글 설정이 필요함)
Secret 3개를 같은 방법으로 추가: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.
1. Google Cloud Console에서 프로젝트 생성 → "YouTube Data API v3" 사용 설정
2. OAuth 동의 화면: 외부, 게시 상태를 **프로덕션**으로(테스트 상태면 토큰이 7일 뒤 만료됨)
3. 사용자 인증 정보 → OAuth 클라이언트 ID(웹 애플리케이션, 리디렉션 URI `https://developers.google.com/oauthplayground`)
4. OAuth Playground 설정(톱니바퀴)에서 "Use your own OAuth credentials"에 클라이언트 ID·보안 비밀번호 입력 → 범위 `https://www.googleapis.com/auth/youtube.upload` 승인 → Refresh token 발급
주의(확인하지 못함): 심사받지 않은 API 프로젝트가 올린 영상은 비공개로 고정될 수 있다고 알려져 있습니다. 그러면 예약 공개가 되지 않으므로 Studio에서 공개로 바꿔야 합니다. 이 경우에는 이 선택 설정 대신 Claude의 Metricool 예약을 쓰세요.

## 3. 멈추는 법
- 저장소에 `pipeline/auto/PAUSE` 파일을 만들면(내용 아무거나) 자동 생성이 멈춥니다.
- 또는 Actions → daily-shorts → ⋯ → Disable workflow.

## 4. 주제 추가
`pipeline/auto/topics.json`의 `backlog`에 주제를 줄 단위로 추가합니다. 비면 자동 생성이 오류로 멈춥니다.

## 한계 (확인된 것)
- 이 시스템을 실제 GitHub Actions에서 끝까지 돌려 보지 못했습니다. 코드와 규칙 검사, 가짜 LLM 응답으로 만든 시험만 통과했습니다.
- 의료·화장품 주장은 출처 확인 없이 LLM이 씁니다. 금지어와 LLM 검수만 있고 사람 검수는 없습니다.
