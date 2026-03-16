# Homsteal vs AUBL 경기 구분 매핑

## 목적
Homsteal 구현과 AUBL 데이터 반영 시 `경기 구분` 의미가 섞이지 않도록 기준을 고정한다.

## Homsteal 기준 (현재 운영)
- 공식 구분값: `LEAGUE`, `PLAYOFF`
- 기본값: `LEAGUE`
- 일정 생성/수정 UI는 `리그`, `플레이오프`만 노출한다.

## 레거시 호환 규칙
- 과거 값 `EUTTEUM`, `BEOGEUM`을 읽으면 내부에서 `PLAYOFF`로 간주한다.
- 저장 시 Homsteal 신규 데이터는 `LEAGUE/PLAYOFF`를 우선 사용한다.

## AUBL 반영 시 매핑 규칙
1. Homsteal `LEAGUE` -> AUBL `LEAGUE`(정규 리그)
2. Homsteal `PLAYOFF` -> AUBL `EUTTEUM` 또는 `BEOGEUM` 중 하나를 별도 결정해서 매핑
3. AUBL -> Homsteal 역반영 시 `EUTTEUM/BEOGEUM`은 모두 `PLAYOFF`로 축약 가능

## 주의사항
- Homsteal에서는 플레이오프 세부 티어(으뜸/버금)를 기본 데이터로 강제하지 않는다.
- AUBL 반영 배치/마이그레이션에서는 `PLAYOFF -> (EUTTEUM|BEOGEUM)` 선택 로직이 반드시 필요하다.
