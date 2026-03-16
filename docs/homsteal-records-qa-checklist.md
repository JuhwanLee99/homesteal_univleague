# Homsteal Records QA Checklist

## 1) 기능 QA
- [ ] 기록원 페이지에서 경기 종료(`status=completed`) 처리 시 `matches/{matchId}.postGame`가 저장된다.
- [ ] 경기 종료 후 수 초 내 `stats/{scopeId}` 및 하위 `players/teams/standings` 문서가 생성/갱신된다.
- [ ] `records` 페이지에서 `순위`, `개인기록(타자)`, `개인기록(투수)` 탭이 정상 동작한다.
- [ ] `scope=LEAGUE`와 `scope=PLAYOFF` 필터가 의도대로 분리되어 노출된다.
- [ ] `playoffDivision=EUTTEUM|BEOGEUM` 필터가 플레이오프 범위에서만 동작한다.

## 2) 데이터 QA
- [ ] 임의 10경기에 대해 팀 승/무/패, 득실, 승점이 수기 계산과 일치한다.
- [ ] 선수 식별 키(`teamId + 이름 + 등번호`)가 동명이인을 분리한다.
- [ ] 동일 경기 문서 재저장/정정 후 집계가 중복 누적되지 않고 재계산 결과로 반영된다.
- [ ] `recordMode=practice` 경기는 집계에서 제외된다.

## 3) 보안 QA
- [ ] 클라이언트 일반 계정으로 `stats/**` 쓰기 시도가 차단된다.
- [ ] 관리자 계정에서만 `stats/**` 수동 쓰기가 가능하다.
- [ ] 기존 `matches` 쓰기 권한(관리자/기록원 제한)이 유지된다.

## 4) UI/회귀 QA
- [ ] Homsteal 기존 테마/레이아웃이 유지된다.
- [ ] 모바일(375px)과 데스크톱(1440px)에서 표/필터가 깨지지 않는다.
- [ ] 기존 `standings/power-ranking` URL 접근 시 `records?tab=standings`으로 리다이렉트된다.

## 5) 배포 검증
- [ ] `firebase use homesteal-univleague`로 대상 프로젝트가 설정되어 있다.
- [ ] `firebase deploy --only firestore:rules,firestore:indexes,functions --project homesteal-univleague` 실행 완료.
- [ ] Functions 배포 후 `aggregate_completed_match_created`, `aggregate_completed_match_updated`, `rebuild_stats` 엔드포인트가 확인된다.
- [ ] Firestore 콘솔에서 `stats/{scopeId}` 문서 및 하위 컬렉션이 정상 생성된다.
