# QA Report - Division Policy Migration (Round 03)

- Report ID: `2026-03-16-division-policy-qa-r03`
- Date (KST): `2026-03-16`
- Scope: `schedule division policy (Homsteal: LEAGUE/PLAYOFF)`
- Environment: `local workspace`

## 1. Goal
- 홈스틸 경기 구분을 `으뜸/버금` 기반이 아닌 `리그/플레이오프` 기반으로 통일
- 기본값을 `리그(LEAGUE)`로 고정
- AUBL 반영 시 매핑 혼동 방지 문서 추가

## 2. Changes
| # | Item | Result |
|---|---|---|
| 1 | 일정 생성/관리 UI 옵션 변경 (`LEAGUE`/`PLAYOFF`) | PASS |
| 2 | 기본값 변경 (`LEAGUE`) | PASS |
| 3 | 레거시 값(`EUTTEUM`/`BEOGEUM`) 호환 매핑 | PASS |
| 4 | 조별 일정 페이지 포스트시즌 탭 단일화 (`PLAYOFF`) | PASS |
| 5 | 문서화 추가 (Homsteal vs AUBL 매핑) | PASS |

## 3. Verification
- Type Check: `npx tsc --noEmit` -> PASS
- Build: `npm run build` -> PASS

## 4. Documentation
- `docs/homsteal-aubl-division-mapping.md` 추가
- `docs/qa/QA_PROCESS.md` 도메인 규칙 섹션에 매핑 문서 참조 추가
