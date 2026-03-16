# QA Report - Scorekeeper/Scoreboard Parity (Round 02)

- Report ID: `2026-03-16-scorekeeper-scoreboard-parity-r02`
- Date (KST): `2026-03-16`
- Scope: `record visibility parity between scorekeeper page and text scoreboard page`
- Environment: `local workspace`

## 1. Pre-check
- Type Check: `PASS` (`npx tsc --noEmit`)
- Build: `PASS` (`npm run build`)

## 2. Check Items
| # | Check Item | Result | Notes |
|---|---|---|---|
| 1 | 실책 요약 표시 항목 일치 | PASS (patched) | 문자중계에 타구/추가판정(extraCalls) 누락되어 보강 |
| 2 | KBO 결과 분류 일치(GDP 루트/Kc) | PASS (patched) | 문자중계가 `GDP`, `K`로만 표시되던 부분을 기록원과 동일화 |
| 3 | 실책 CSV 필드 출력 안전성 | PASS (patched) | `formatErrorField`를 제한된 필드 타입으로 정리 |
| 4 | 이벤트 상세(실책) 내 추가 판정 노출 | PASS (patched) | 주루 방해/주자 수비방해 결과 텍스트 반영 |
| 5 | 빌드/타입 회귀 여부 | PASS | 회귀 오류 없음 |

## 3. Findings
- P1: 문자중계 `formatErrorSummary`가 기록원 대비 단순하여 `battedBall`, `extraCalls`가 표시되지 않음
  - Action: 기록원과 동일한 요약 포맷으로 보강
- P1: 문자중계 `classifyKboResult`가 `dpRoute`, `strikeType`를 반영하지 않아 `GDP(route)`/`Kc`가 누락됨
  - Action: 분기 로직을 기록원과 동일화
- P2: 이벤트 상세 실책 문자열에서 추가 판정이 빠짐
  - Action: `formatErrorDetail`에 `extraCalls` 포함

## 4. Patch Summary
- `src/features/scoreboard/pages/ScoreboardTextPage.tsx`
  - `formatErrorSummary` 보강 (타구/추가판정 포함)
  - `classifyKboResult` 보강 (`GDP(route)`, `Kc`)
  - `formatErrorField` 타입 제한 (`fielderPos | errorType | context`)
  - `formatErrorDetail` 보강 (extraCalls 노출)
- `src/scoreboard/pages/ScoreboardTextPage.tsx`
  - 위와 동일 로직 동기화 (중복 경로 간 드리프트 방지)

## 5. Residual Risk
- 런타임에서 실제 동일 표출을 완전 보장하려면, 동일 경기 데이터로
  `기록원 이벤트 표` vs `문자중계 상세 이벤트` 스냅샷 비교 E2E 1회가 추가로 필요함.
