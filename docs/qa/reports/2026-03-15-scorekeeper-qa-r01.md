# QA Report - Scorekeeper Record System (Round 01)

- Report ID: `2026-03-15-scorekeeper-qa-r01`
- Date (KST): `2026-03-15 22:57:25 KST`
- Scope: `scorekeeper / scoreboard(stat mirror) / sync`
- Environment: `local workspace`

## 1. Pre-check
- Build: `PASS`
- Lint: `PASS`

## 2. Scenario Results
| # | Scenario | Result | Notes |
|---|---|---|---|
| 1 | Undo/Redo + 새 입력 시 redo stack 초기화 | PASS | history/futureHistory 동작 확인 |
| 2 | 일정관리 경기명 클릭 시 해당 경기 이동 | PASS | selectMatch + /scorekeeper/:matchId 이동 확인 |
| 3 | 포지션 숫자 입력 통일(1~9,0) | PASS | 0=DH, 1~9=P~RF 매핑 확인 |
| 4 | reach_error 타구 방향 이벤트/CSV 반영 | PASS | battedBall/error summary CSV 반영 확인 |
| 5 | 주자 수비방해/주루 방해 분리 기록 | PASS | out/advance 분기 확인 |
| 6 | 모달 가시성/스크롤(맥/소형뷰) | PASS | maxHeight+overflowY+overscroll 적용 확인 |
| 7 | WP/PB/포일 카운트 반영/경계값 | PASS | 미선택 차단 + 3볼/2스트 hold 방지 |
| 8 | 저장 실패 시 재시도 | PASS | sync write 실패 시 백그라운드 retry 추가 |

## 3. Findings
- P1: 실책 출루가 일부 통계 경로에서 누락될 수 있던 문제
  - Action: result 분류에 `error` 추가, AB/PA/BF 집계 반영
- P1: CI가 live 통계에서 BB로 집계되던 불일치
  - Action: `CI` 전용 필드 집계로 통일
- P1: 만루 볼넷/사구/CI 및 희생타 득점에서 주자 R 누락 가능성
  - Action: 이벤트 runner summary를 득점 형태로 보존
- P2: 실책 복합판정 시 대상 주자 매칭 불일치 가능성
  - Action: extraCall에 runnerName 저장 + 적용 시 재매핑
- P2: 추가 판정 1건만 입력 가능
  - Action: 추가판정 다건 누적 UI 확장
- P2: 저장 실패 후 무입력 상태에서 재시도 없음
  - Action: 동기화 백그라운드 재시도 루프 추가
- P2: 주루 방해 +1루에서 점유 베이스일 때 과진루 가능성
  - Action: exact base 배치 로직 추가(점유 시 hold)

## 4. Patch Summary
- `src/shared/state/demoStore.tsx`
  - runner obstruction/interference 정교화, forced-score runner summary, exact-base 배치, 타이머 정리
- `src/shared/state/demoStore.effects.ts`
  - game state sync 실패 재시도 추가
- `src/features/scorekeeper/pages/ScorekeeperPage.tsx`
  - error/CI 통계 분류 보정, WP/PB 경계 검증, 추가판정 다건 UI
- `src/shared/state/demoStore.record.ts`
  - error 분류/집계 반영
- `src/features/scoreboard/pages/ScoreboardTextPage.tsx`
  - scorekeeper 통계 로직 미러 경로 동일 보정(error/CI)

## 5. Final Verification
- Build: `PASS`
- Lint: `PASS`
- Residual Risk: `수동 E2E(실사용 입력 흐름) 추가 점검 권장`
