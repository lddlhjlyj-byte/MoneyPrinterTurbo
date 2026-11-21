# 쇼츠 제작 파이프라인 (9단계 폴더 + 5역할)

영상 1개는 `projects/<영상슬러그>/` 폴더 1개에 단계별 산출물을 모은다. `<영상슬러그>`는 cards.json의 `name`과 같은 영문 이름이다(재사용하면 덮어써진다).

```
projects/<영상슬러그>/
├─ 01_research    조사: 경쟁 영상, 키워드, 출처 수집, 사실 확인        (research.md)
├─ 02_topic       주제선정: 후보와 선택 이유                           (topic.md)
├─ 03_plan        기획서                                              (plan.md)
├─ 04_script      스크립트: 장면 구성, 화면 키워드                      (scenes.json, direction.md)
├─ 05_narration   대본: 나레이션 문장                                  (script.json)
├─ 06_voice       음성, 자막                                          (voice.json)
├─ 07_video       소스, 합성 영상                                      (video.json)
├─ 08_verify      검증: 사실 출처, 대본 검수, 음성 오독, 영상 확인, 라이선스
│                 (facts.md, script_review.md, voice_check.md, video_check.md, license.md)
├─ 09_publish     제목, 설명, 썸네일, 출처                              (publish.json)
└─ status.json    단계별 상태(done / auto / pending)와 메모
```

각 폴더의 `_STAGE.md`에 그 단계의 목적과 필수 파일이 적혀 있다.

## 상태 값
- `done`: 사람 또는 Claude가 직접 확인함
- `auto`: 자동으로 만들거나 측정만 됨(확인 전). 예: 영상 확인은 소리·길이·장면 타이밍만 측정
- `pending`: 아직 안 함. 자동 제작은 웹 조사(01)를 하지 않으므로 pending으로 남는다

## 명령 (저장소 루트에서)
| 명령 | 하는 일 |
|---|---|
| `python3 pipeline/project.py new <슬러그>` | 9개 폴더·안내 파일·status.json 생성 |
| `python3 pipeline/project.py from-cards <슬러그>` | `shorts-video/src/cards.json`에서 04·05 채움 |
| `python3 pipeline/project.py sync <슬러그>` | 렌더링 뒤 06·07·08(자동 측정분)·09 채움 |
| `python3 pipeline/project.py check <슬러그>` | 단계별 필수 파일 미작성 여부 표시 |

## 자동으로 채워지는 시점
- 자동 제작(`generate.py`): 렌더링 전에 01·02·03·04·05와 08의 facts·script_review를 기록한다.
- 렌더링 워크플로(`infocard.yml`): 영상 보관 뒤 `project.py sync`가 06·07·09와 08의 video_check를 채운다.
- 사용자가 준 대본으로 만드는 영상: Claude가 `new` → 01~03 조사·기획 작성 → `from-cards` → 렌더링 → `sync` 순으로 진행한다.

## 역할과 단계
| 역할 | 맡는 단계 | 문서 |
|---|---|---|
| 기획자 | 01 조사, 02 주제선정, 03 기획서 | roles/1-planner.md |
| 작가 | 05 대본 (04의 화면 글자 포함) | roles/2-writer.md |
| 디자이너 | 04 스크립트(그림·move·gesture·mood) | roles/3-designer.md |
| 제작자 | 06 음성, 07 영상, 09 게시 | roles/4-producer.md |
| 검수자 | 08 검증 (제작에 관여하지 않은 별도 에이전트) | roles/5-reviewer.md |

## 규칙
- 검수자는 05 대본·04 스크립트·cards.json과 08의 근거만 보고 비판한다. 제작자의 설명은 주지 않는다.
- 검수에서 "수정 필요"가 나오면 해당 단계로 돌아간다. 수정 후 재검수는 심각한 항목만 한다.
- 확인하지 못한 것은 해당 파일에 "미확인"으로 적는다. 자동 측정 통과를 "확인함"으로 바꿔 쓰지 않는다.
- 2026-11-21 이전 영상의 기록은 `content/briefs/<name>.md`에 있다(이동하지 않음). 새 영상부터 `projects/`를 쓴다.
