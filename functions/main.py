import json
import logging
import re
import time

from firebase_admin import auth as admin_auth
from firebase_admin import firestore as admin_firestore
from firebase_admin import initialize_app
from firebase_functions import firestore_fn, https_fn
from firebase_functions.options import set_global_options

logger = logging.getLogger(__name__)

_COMPLETED_STATUSES = {"completed", "final", "ended", "종료"}
AGGREGATION_VERSION = 1

set_global_options(max_instances=10)
initialize_app()


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _cors_headers() -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }


def _json_response(payload: dict[str, object], status: int = 200) -> https_fn.Response:
    headers = _cors_headers()
    headers["Content-Type"] = "application/json"
    return https_fn.Response(json.dumps(payload, ensure_ascii=False), status=status, headers=headers)


def _to_int(value: object, default: int = 0) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value != value:  # NaN
            return default
        return int(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return default
        try:
            return int(float(text))
        except Exception:  # noqa: BLE001
            return default
    return default


def _to_float(value: object, default: float = 0.0) -> float:
    if isinstance(value, bool):
        return float(int(value))
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return default
        try:
            return float(text)
        except Exception:  # noqa: BLE001
            return default
    return default


def _to_text(value: object, default: str = "") -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return default
    return str(value)


def _timestamp_ms() -> int:
    return int(time.time() * 1000)


def _normalize_status(value: object) -> str:
    return _to_text(value, "").strip().lower()


def _normalize_record_mode(value: object) -> str:
    return "practice" if _to_text(value, "").strip().lower() == "practice" else "official"


def _normalize_division(value: object) -> str:
    raw = _to_text(value, "").strip().upper()
    if raw in ("EUTTEUM", "BEOGEUM"):
        return raw
    return "LEAGUE"


def _derive_season_id(match_data: dict[str, object]) -> int:
    season_id = _to_int(match_data.get("seasonId"), 0)
    if season_id > 0:
        return season_id
    start_time = _to_text(match_data.get("startTime"), "")
    if len(start_time) >= 4 and start_time[:4].isdigit():
        year = _to_int(start_time[:4], 0)
        if 2000 <= year <= 2100:
            return year
    return 0


def _derive_scope(match_data: dict[str, object]) -> dict[str, object]:
    season_id = _derive_season_id(match_data)
    division = _normalize_division(match_data.get("division"))
    record_mode = _normalize_record_mode(match_data.get("recordMode"))
    season_type = "PLAYOFF" if division in ("EUTTEUM", "BEOGEUM") else "LEAGUE"
    scope_id = f"{season_id}__{division}__{record_mode}"
    return {
        "scopeId": scope_id,
        "seasonId": season_id,
        "seasonYear": season_id,
        "division": division,
        "seasonType": season_type,
        "recordMode": record_mode,
    }


def _is_aggregatable_match(match_data: dict[str, object]) -> bool:
    if _normalize_record_mode(match_data.get("recordMode")) == "practice":
        return False
    status = _normalize_status(match_data.get("status"))
    if status not in _COMPLETED_STATUSES:
        return False
    post_game = match_data.get("postGame")
    return isinstance(post_game, dict)


def _normalize_player_name(name: str) -> str:
    return " ".join(name.strip().split()).lower()


def _parse_player_name_and_back_number(raw_name: object) -> tuple[str, str]:
    text = _to_text(raw_name, "").strip()
    if not text:
        return "", ""
    match = re.match(r"^(.*?)(?:\(([^()]+)\))?$", text)
    if not match:
        return text, ""
    name = (match.group(1) or "").strip() or text
    back_number = (match.group(2) or "").strip()
    return name, back_number


def _sanitize_key_segment(value: str) -> str:
    if not value:
        return ""
    lowered = value.strip().lower()
    lowered = re.sub(r"\s+", "-", lowered)
    return re.sub(r"[^a-z0-9._-]", "", lowered)


def _build_player_key(team_id: str, player_name: str, back_number: str) -> str:
    team_part = _sanitize_key_segment(team_id) or "unknown-team"
    name_part = _sanitize_key_segment(_normalize_player_name(player_name)) or "unknown-player"
    number_part = _sanitize_key_segment(back_number) or "00"
    return f"{team_part}__{name_part}__{number_part}"


def _to_outs_from_ip(ip_value: object) -> int:
    value = _to_float(ip_value, 0.0)
    whole = int(value)
    decimal = int(round((value - whole) * 10))
    if decimal < 0:
        decimal = 0
    if decimal > 2:
        decimal = 2
    return whole * 3 + decimal


def _outs_to_ip(outs: int) -> float:
    whole = outs // 3
    remainder = outs % 3
    return float(f"{whole}.{remainder}")


def _regulation_in_for_batter(games_played: int, plate_appearances: int) -> str:
    threshold = max(1, games_played * 2)
    return "IN" if plate_appearances >= threshold else "OUT"


def _regulation_in_for_pitcher(games_played: int, outs: int) -> str:
    threshold_outs = max(3, games_played * 3)
    return "IN" if outs >= threshold_outs else "OUT"


def _team_key(team_id: str, team_name: str) -> str:
    team_id_text = _to_text(team_id, "").strip()
    if team_id_text:
        return f"id:{team_id_text}"
    return f"name:{team_name.strip().lower()}"


def _compute_head_to_head_points(
    completed_results: list[dict[str, object]],
    tied_team_keys: set[str],
) -> dict[str, int]:
    points_map: dict[str, int] = {key: 0 for key in tied_team_keys}

    for result in completed_results:
        home_key = _to_text(result.get("homeTeamKey"), "")
        away_key = _to_text(result.get("awayTeamKey"), "")
        if home_key not in tied_team_keys or away_key not in tied_team_keys:
            continue
        home_score = _to_int(result.get("homeScore"), 0)
        away_score = _to_int(result.get("awayScore"), 0)
        if home_score > away_score:
            points_map[home_key] = points_map.get(home_key, 0) + 3
        elif home_score < away_score:
            points_map[away_key] = points_map.get(away_key, 0) + 3
        else:
            points_map[home_key] = points_map.get(home_key, 0) + 1
            points_map[away_key] = points_map.get(away_key, 0) + 1
    return points_map


def _sort_standings(
    teams: list[dict[str, object]],
    completed_results: list[dict[str, object]],
) -> list[dict[str, object]]:
    by_points: dict[int, list[dict[str, object]]] = {}
    for team in teams:
        points = _to_int(team.get("points"), 0)
        by_points.setdefault(points, []).append(team)

    ordered: list[dict[str, object]] = []
    for points in sorted(by_points.keys(), reverse=True):
        group = by_points.get(points, [])
        if len(group) == 1:
            team = dict(group[0])
            team["headToHeadPoints"] = 0
            ordered.append(team)
            continue

        tied_keys = {_team_key(_to_text(team.get("teamId"), ""), _to_text(team.get("teamName"), "")) for team in group}
        h2h_points = _compute_head_to_head_points(completed_results, tied_keys)

        def _group_sort_key(team: dict[str, object]) -> tuple[int, int, int, int, int, str]:
            key = _team_key(_to_text(team.get("teamId"), ""), _to_text(team.get("teamName"), ""))
            return (
                _to_int(team.get("forfeitLosses"), 0),
                -_to_int(team.get("draws"), 0),
                -h2h_points.get(key, 0),
                -_to_int(team.get("runDiff"), 0),
                -_to_int(team.get("runsFor"), 0),
                _to_text(team.get("teamName"), ""),
            )

        sorted_group = sorted(group, key=_group_sort_key)
        for team in sorted_group:
            cloned = dict(team)
            key = _team_key(_to_text(team.get("teamId"), ""), _to_text(team.get("teamName"), ""))
            cloned["headToHeadPoints"] = h2h_points.get(key, 0)
            ordered.append(cloned)

    for idx, team in enumerate(ordered):
        team["rank"] = idx + 1
    return ordered


def _commit_documents(
    collection_ref: admin_firestore.CollectionReference,
    docs_by_id: dict[str, dict[str, object]],
) -> None:
    existing_ids = {snapshot.id for snapshot in collection_ref.stream()}
    incoming_ids = set(docs_by_id.keys())
    batch = admin_firestore.client().batch()
    op_count = 0

    def _flush() -> None:
        nonlocal batch, op_count
        if op_count == 0:
            return
        batch.commit()
        batch = admin_firestore.client().batch()
        op_count = 0

    for doc_id, payload in docs_by_id.items():
        batch.set(collection_ref.document(doc_id), payload, merge=False)
        op_count += 1
        if op_count >= 400:
            _flush()

    for stale_id in existing_ids - incoming_ids:
        batch.delete(collection_ref.document(stale_id))
        op_count += 1
        if op_count >= 400:
            _flush()

    _flush()


def _rebuild_scope_stats(scope: dict[str, object], matches: list[dict[str, object]]) -> dict[str, int]:
    db = admin_firestore.client()
    scope_id = _to_text(scope.get("scopeId"), "")
    if not scope_id:
        return {"matchCount": 0, "playerCount": 0, "teamCount": 0, "standingCount": 0}
    timestamp_ms = _timestamp_ms()

    players: dict[str, dict[str, object]] = {}
    teams: dict[str, dict[str, object]] = {}
    completed_results: list[dict[str, object]] = []
    processed_matches: dict[str, dict[str, object]] = {}

    for match in matches:
        match_id = _to_text(match.get("id"), "")
        home_team_name = _to_text(match.get("homeTeamName"), "홈팀").strip() or "홈팀"
        away_team_name = _to_text(match.get("awayTeamName"), "원정팀").strip() or "원정팀"
        home_team_id = _to_text(match.get("homeTeamId"), "").strip() or home_team_name
        away_team_id = _to_text(match.get("awayTeamId"), "").strip() or away_team_name

        home_score = _to_int(match.get("homeScore"), 0)
        away_score = _to_int(match.get("awayScore"), 0)
        post_game = match.get("postGame")
        if isinstance(post_game, dict):
            totals = post_game.get("totals")
            if isinstance(totals, dict):
                home_totals = totals.get("home")
                away_totals = totals.get("away")
                if isinstance(home_totals, dict):
                    home_score = _to_int(home_totals.get("runs"), home_score)
                if isinstance(away_totals, dict):
                    away_score = _to_int(away_totals.get("runs"), away_score)

        for team_id, team_name in [(home_team_id, home_team_name), (away_team_id, away_team_name)]:
            if team_id not in teams:
                teams[team_id] = {
                    "teamId": team_id,
                    "teamName": team_name,
                    "scopeId": scope_id,
                    "seasonId": _to_int(scope.get("seasonId"), 0),
                    "seasonYear": _to_int(scope.get("seasonYear"), 0),
                    "division": _to_text(scope.get("division"), "LEAGUE"),
                    "seasonType": _to_text(scope.get("seasonType"), "LEAGUE"),
                    "recordMode": _to_text(scope.get("recordMode"), "official"),
                    "played": 0,
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                    "points": 0,
                    "runsFor": 0,
                    "runsAgainst": 0,
                    "runDiff": 0,
                    "forfeitLosses": 0,
                    "updatedAt": timestamp_ms,
                }

        home_team = teams[home_team_id]
        away_team = teams[away_team_id]
        home_team["played"] = _to_int(home_team.get("played"), 0) + 1
        away_team["played"] = _to_int(away_team.get("played"), 0) + 1
        home_team["runsFor"] = _to_int(home_team.get("runsFor"), 0) + home_score
        home_team["runsAgainst"] = _to_int(home_team.get("runsAgainst"), 0) + away_score
        away_team["runsFor"] = _to_int(away_team.get("runsFor"), 0) + away_score
        away_team["runsAgainst"] = _to_int(away_team.get("runsAgainst"), 0) + home_score

        if home_score > away_score:
            home_team["wins"] = _to_int(home_team.get("wins"), 0) + 1
            home_team["points"] = _to_int(home_team.get("points"), 0) + 3
            away_team["losses"] = _to_int(away_team.get("losses"), 0) + 1
        elif home_score < away_score:
            away_team["wins"] = _to_int(away_team.get("wins"), 0) + 1
            away_team["points"] = _to_int(away_team.get("points"), 0) + 3
            home_team["losses"] = _to_int(home_team.get("losses"), 0) + 1
        else:
            home_team["draws"] = _to_int(home_team.get("draws"), 0) + 1
            away_team["draws"] = _to_int(away_team.get("draws"), 0) + 1
            home_team["points"] = _to_int(home_team.get("points"), 0) + 1
            away_team["points"] = _to_int(away_team.get("points"), 0) + 1

        completed_results.append(
            {
                "homeTeamKey": _team_key(home_team_id, home_team_name),
                "awayTeamKey": _team_key(away_team_id, away_team_name),
                "homeScore": home_score,
                "awayScore": away_score,
            }
        )

        post_game = match.get("postGame")
        batters_by_side: dict[str, object] = {}
        pitchers_by_side: dict[str, object] = {}
        if isinstance(post_game, dict):
            raw_batters = post_game.get("batters")
            raw_pitchers = post_game.get("pitchers")
            if isinstance(raw_batters, dict):
                batters_by_side = raw_batters
            if isinstance(raw_pitchers, dict):
                pitchers_by_side = raw_pitchers

        match_seen_batters: set[str] = set()
        match_seen_pitchers: set[str] = set()

        for side in ("home", "away"):
            side_lines = batters_by_side.get(side) if isinstance(batters_by_side, dict) else None
            if not isinstance(side_lines, list):
                side_lines = []
            team_id = home_team_id if side == "home" else away_team_id
            team_name = home_team_name if side == "home" else away_team_name

            for raw_line in side_lines:
                if not isinstance(raw_line, dict):
                    continue
                player_name, back_number = _parse_player_name_and_back_number(raw_line.get("name"))
                if not player_name:
                    continue
                player_key = _build_player_key(team_id, player_name, back_number)
                player_doc = players.get(player_key)
                if player_doc is None:
                    player_doc = {
                        "playerKey": player_key,
                        "scopeId": scope_id,
                        "seasonId": _to_int(scope.get("seasonId"), 0),
                        "seasonYear": _to_int(scope.get("seasonYear"), 0),
                        "division": _to_text(scope.get("division"), "LEAGUE"),
                        "seasonType": _to_text(scope.get("seasonType"), "LEAGUE"),
                        "recordMode": _to_text(scope.get("recordMode"), "official"),
                        "teamId": team_id,
                        "teamName": team_name,
                        "playerName": player_name,
                        "normalizedName": _normalize_player_name(player_name),
                        "backNumber": back_number,
                        "batting": {
                            "gamesPlayed": 0,
                            "pa": 0,
                            "ab": 0,
                            "h": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "hr": 0,
                            "bb": 0,
                            "hbp": 0,
                            "so": 0,
                            "sac": 0,
                            "fc": 0,
                            "r": 0,
                            "rbi": 0,
                            "sb": 0,
                            "battingAverage": 0.0,
                            "onBasePct": 0.0,
                            "sluggingPct": 0.0,
                            "ops": 0.0,
                            "regulation": "OUT",
                        },
                        "pitching": {
                            "gamesPlayed": 0,
                            "outs": 0,
                            "inningsPitched": 0.0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "strikeouts": 0,
                            "walksAllowed": 0,
                            "hitsAllowed": 0,
                            "runsAllowed": 0,
                            "earnedRuns": 0,
                            "era": 0.0,
                            "whip": 0.0,
                            "regulation": "OUT",
                        },
                        "updatedAt": timestamp_ms,
                        "lastMatchId": match_id or None,
                        "lastMatchAt": timestamp_ms,
                    }
                    players[player_key] = player_doc

                batting = player_doc["batting"]
                if isinstance(batting, dict):
                    if player_key not in match_seen_batters:
                        batting["gamesPlayed"] = _to_int(batting.get("gamesPlayed"), 0) + 1
                        match_seen_batters.add(player_key)
                    batting["pa"] = _to_int(batting.get("pa"), 0) + _to_int(raw_line.get("pa"), 0)
                    batting["ab"] = _to_int(batting.get("ab"), 0) + _to_int(raw_line.get("ab"), 0)
                    batting["h"] = _to_int(batting.get("h"), 0) + _to_int(raw_line.get("h"), 0)
                    batting["singles"] = _to_int(batting.get("singles"), 0) + _to_int(raw_line.get("singles"), 0)
                    batting["doubles"] = _to_int(batting.get("doubles"), 0) + _to_int(raw_line.get("doubles"), 0)
                    batting["triples"] = _to_int(batting.get("triples"), 0) + _to_int(raw_line.get("triples"), 0)
                    batting["hr"] = _to_int(batting.get("hr"), 0) + _to_int(raw_line.get("hr"), 0)
                    batting["bb"] = _to_int(batting.get("bb"), 0) + _to_int(raw_line.get("bb"), 0)
                    batting["hbp"] = _to_int(batting.get("hbp"), 0) + _to_int(raw_line.get("hbp"), 0)
                    batting["so"] = _to_int(batting.get("so"), 0) + _to_int(raw_line.get("so"), 0)
                    batting["sac"] = _to_int(batting.get("sac"), 0) + _to_int(raw_line.get("sac"), 0)
                    batting["fc"] = _to_int(batting.get("fc"), 0) + _to_int(raw_line.get("fc"), 0)
                    batting["r"] = _to_int(batting.get("r"), 0) + _to_int(raw_line.get("r"), 0)
                    batting["rbi"] = _to_int(batting.get("rbi"), 0) + _to_int(raw_line.get("rbi"), 0)
                    batting["sb"] = _to_int(batting.get("sb"), 0) + _to_int(raw_line.get("sb"), 0)
                player_doc["lastMatchId"] = match_id or None

            side_pitchers = pitchers_by_side.get(side) if isinstance(pitchers_by_side, dict) else None
            if not isinstance(side_pitchers, list):
                side_pitchers = []

            for raw_line in side_pitchers:
                if not isinstance(raw_line, dict):
                    continue
                player_name, back_number = _parse_player_name_and_back_number(raw_line.get("name"))
                if not player_name:
                    continue
                player_key = _build_player_key(team_id, player_name, back_number)
                player_doc = players.get(player_key)
                if player_doc is None:
                    player_doc = {
                        "playerKey": player_key,
                        "scopeId": scope_id,
                        "seasonId": _to_int(scope.get("seasonId"), 0),
                        "seasonYear": _to_int(scope.get("seasonYear"), 0),
                        "division": _to_text(scope.get("division"), "LEAGUE"),
                        "seasonType": _to_text(scope.get("seasonType"), "LEAGUE"),
                        "recordMode": _to_text(scope.get("recordMode"), "official"),
                        "teamId": team_id,
                        "teamName": team_name,
                        "playerName": player_name,
                        "normalizedName": _normalize_player_name(player_name),
                        "backNumber": back_number,
                        "batting": {
                            "gamesPlayed": 0,
                            "pa": 0,
                            "ab": 0,
                            "h": 0,
                            "singles": 0,
                            "doubles": 0,
                            "triples": 0,
                            "hr": 0,
                            "bb": 0,
                            "hbp": 0,
                            "so": 0,
                            "sac": 0,
                            "fc": 0,
                            "r": 0,
                            "rbi": 0,
                            "sb": 0,
                            "battingAverage": 0.0,
                            "onBasePct": 0.0,
                            "sluggingPct": 0.0,
                            "ops": 0.0,
                            "regulation": "OUT",
                        },
                        "pitching": {
                            "gamesPlayed": 0,
                            "outs": 0,
                            "inningsPitched": 0.0,
                            "wins": 0,
                            "losses": 0,
                            "saves": 0,
                            "strikeouts": 0,
                            "walksAllowed": 0,
                            "hitsAllowed": 0,
                            "runsAllowed": 0,
                            "earnedRuns": 0,
                            "era": 0.0,
                            "whip": 0.0,
                            "regulation": "OUT",
                        },
                        "updatedAt": timestamp_ms,
                        "lastMatchId": match_id or None,
                        "lastMatchAt": timestamp_ms,
                    }
                    players[player_key] = player_doc

                pitching = player_doc["pitching"]
                if isinstance(pitching, dict):
                    if player_key not in match_seen_pitchers:
                        pitching["gamesPlayed"] = _to_int(pitching.get("gamesPlayed"), 0) + 1
                        match_seen_pitchers.add(player_key)
                    outs = _to_outs_from_ip(raw_line.get("ip"))
                    pitching["outs"] = _to_int(pitching.get("outs"), 0) + outs
                    pitching["strikeouts"] = _to_int(pitching.get("strikeouts"), 0) + _to_int(raw_line.get("so"), 0)
                    pitching["walksAllowed"] = _to_int(pitching.get("walksAllowed"), 0) + _to_int(raw_line.get("bb"), 0)
                    pitching["hitsAllowed"] = _to_int(pitching.get("hitsAllowed"), 0) + _to_int(raw_line.get("h"), 0)
                    pitching["runsAllowed"] = _to_int(pitching.get("runsAllowed"), 0) + _to_int(raw_line.get("r"), 0)
                    pitching["earnedRuns"] = _to_int(pitching.get("earnedRuns"), 0) + _to_int(raw_line.get("er"), 0)
                    result_text = _to_text(raw_line.get("result"), "")
                    if "승" in result_text:
                        pitching["wins"] = _to_int(pitching.get("wins"), 0) + 1
                    if "패" in result_text:
                        pitching["losses"] = _to_int(pitching.get("losses"), 0) + 1
                    if "세" in result_text or "SV" in result_text.upper():
                        pitching["saves"] = _to_int(pitching.get("saves"), 0) + 1
                player_doc["lastMatchId"] = match_id or None

        if match_id:
            processed_matches[match_id] = {
                "matchId": match_id,
                "scopeId": scope_id,
                "aggregationVersion": AGGREGATION_VERSION,
                "processedAt": timestamp_ms,
            }

    for team in teams.values():
        team["runDiff"] = _to_int(team.get("runsFor"), 0) - _to_int(team.get("runsAgainst"), 0)
        team["updatedAt"] = timestamp_ms

    for player in players.values():
        batting = player.get("batting")
        if isinstance(batting, dict):
            ab = _to_int(batting.get("ab"), 0)
            h = _to_int(batting.get("h"), 0)
            bb = _to_int(batting.get("bb"), 0)
            hbp = _to_int(batting.get("hbp"), 0)
            sac = _to_int(batting.get("sac"), 0)
            total_bases = (
                _to_int(batting.get("singles"), 0)
                + _to_int(batting.get("doubles"), 0) * 2
                + _to_int(batting.get("triples"), 0) * 3
                + _to_int(batting.get("hr"), 0) * 4
            )
            obp_denominator = ab + bb + hbp + sac
            batting_average = (h / ab) if ab > 0 else 0.0
            on_base = ((h + bb + hbp) / obp_denominator) if obp_denominator > 0 else 0.0
            slugging = (total_bases / ab) if ab > 0 else 0.0
            batting["battingAverage"] = round(batting_average, 3)
            batting["onBasePct"] = round(on_base, 3)
            batting["sluggingPct"] = round(slugging, 3)
            batting["ops"] = round(on_base + slugging, 3)
            batting["regulation"] = _regulation_in_for_batter(
                _to_int(batting.get("gamesPlayed"), 0),
                _to_int(batting.get("pa"), 0),
            )

        pitching = player.get("pitching")
        if isinstance(pitching, dict):
            outs = _to_int(pitching.get("outs"), 0)
            innings = outs / 3 if outs > 0 else 0.0
            earned_runs = _to_int(pitching.get("earnedRuns"), 0)
            hits_allowed = _to_int(pitching.get("hitsAllowed"), 0)
            walks_allowed = _to_int(pitching.get("walksAllowed"), 0)
            era = (earned_runs * 9 / innings) if innings > 0 else 0.0
            whip = ((hits_allowed + walks_allowed) / innings) if innings > 0 else 0.0
            pitching["inningsPitched"] = _outs_to_ip(outs)
            pitching["era"] = round(era, 2)
            pitching["whip"] = round(whip, 2)
            pitching["regulation"] = _regulation_in_for_pitcher(
                _to_int(pitching.get("gamesPlayed"), 0),
                outs,
            )

        player["updatedAt"] = timestamp_ms
        player["lastMatchAt"] = timestamp_ms

    standings = _sort_standings(list(teams.values()), completed_results)
    standings_by_id: dict[str, dict[str, object]] = {}
    for row in standings:
        team_id = _to_text(row.get("teamId"), "")
        if not team_id:
            continue
        standings_by_id[team_id] = row

    scope_ref = db.collection("stats").document(scope_id)
    scope_ref.set(
        {
            "scopeId": scope_id,
            "seasonId": _to_int(scope.get("seasonId"), 0),
            "seasonYear": _to_int(scope.get("seasonYear"), 0),
            "division": _to_text(scope.get("division"), "LEAGUE"),
            "seasonType": _to_text(scope.get("seasonType"), "LEAGUE"),
            "recordMode": _to_text(scope.get("recordMode"), "official"),
            "matchCount": len(matches),
            "aggregationVersion": AGGREGATION_VERSION,
            "updatedAt": timestamp_ms,
        },
        merge=True,
    )

    _commit_documents(scope_ref.collection("players"), players)
    _commit_documents(scope_ref.collection("teams"), teams)
    _commit_documents(scope_ref.collection("standings"), standings_by_id)
    _commit_documents(scope_ref.collection("meta").document("meta").collection("processedMatches"), processed_matches)

    return {
        "matchCount": len(matches),
        "playerCount": len(players),
        "teamCount": len(teams),
        "standingCount": len(standings_by_id),
    }


def _load_matches_for_scope(target_scope: dict[str, object]) -> list[dict[str, object]]:
    db = admin_firestore.client()
    output: list[dict[str, object]] = []
    for snapshot in db.collection("matches").stream():
        if not snapshot.exists:
            continue
        data = snapshot.to_dict() or {}
        if not isinstance(data, dict):
            continue
        if not _is_aggregatable_match(data):
            continue
        scope = _derive_scope(data)
        if scope["scopeId"] != target_scope["scopeId"]:
            continue
        data["id"] = snapshot.id
        output.append(data)
    return output


def _rebuild_scope_from_match(match_data: dict[str, object]) -> dict[str, int]:
    scope = _derive_scope(match_data)
    matches = _load_matches_for_scope(scope)
    return _rebuild_scope_stats(scope, matches)


@firestore_fn.on_document_created(document="matches/{matchId}", region="asia-northeast3")
def aggregate_completed_match_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    data = event.data.to_dict() if event.data else {}
    if not data or not _is_aggregatable_match(data):
        return
    try:
        result = _rebuild_scope_from_match(data)
        logger.info(
            "aggregate_completed_match_created: scope=%s matches=%s players=%s teams=%s standings=%s",
            _derive_scope(data).get("scopeId"),
            result.get("matchCount"),
            result.get("playerCount"),
            result.get("teamCount"),
            result.get("standingCount"),
        )
    except Exception:  # noqa: BLE001
        logger.exception("aggregate_completed_match_created failed")


@firestore_fn.on_document_updated(document="matches/{matchId}", region="asia-northeast3")
def aggregate_completed_match_updated(
    event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]],
) -> None:
    after = event.data.after.to_dict() if event.data and event.data.after else {}
    if not after or not _is_aggregatable_match(after):
        return
    try:
        result = _rebuild_scope_from_match(after)
        logger.info(
            "aggregate_completed_match_updated: scope=%s matches=%s players=%s teams=%s standings=%s",
            _derive_scope(after).get("scopeId"),
            result.get("matchCount"),
            result.get("playerCount"),
            result.get("teamCount"),
            result.get("standingCount"),
        )
    except Exception:  # noqa: BLE001
        logger.exception("aggregate_completed_match_updated failed")


def _require_admin(req: https_fn.Request) -> tuple[bool, https_fn.Response | None]:
    auth_header = req.headers.get("Authorization") or ""
    if not auth_header.startswith("Bearer "):
        return False, _json_response({"error": "unauthorized", "message": "Authorization Bearer token is required."}, status=401)
    token = auth_header.replace("Bearer ", "", 1).strip()
    try:
        decoded = admin_auth.verify_id_token(token)
    except Exception as exc:  # noqa: BLE001
        return False, _json_response({"error": "unauthorized", "message": str(exc)}, status=401)
    if decoded.get("admin") is not True:
        return False, _json_response({"error": "forbidden", "message": "Admin privilege is required."}, status=403)
    return True, None


@https_fn.on_request(region="asia-northeast3")
def rebuild_stats(req: https_fn.Request) -> https_fn.Response:
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204, headers=_cors_headers())
    if req.method != "POST":
        return _json_response({"error": "method_not_allowed"}, status=405)

    ok, failure = _require_admin(req)
    if not ok and failure is not None:
        return failure

    payload = req.get_json(silent=True) or {}
    scope_id_filter = _to_text(payload.get("scopeId"), "").strip()
    season_id_filter = _to_int(payload.get("seasonId"), 0)

    db = admin_firestore.client()
    grouped: dict[str, dict[str, object]] = {}
    grouped_matches: dict[str, list[dict[str, object]]] = {}

    for snapshot in db.collection("matches").stream():
        if not snapshot.exists:
            continue
        data = snapshot.to_dict() or {}
        if not isinstance(data, dict):
            continue
        if not _is_aggregatable_match(data):
            continue

        scope = _derive_scope(data)
        scope_id = _to_text(scope.get("scopeId"), "")
        season_id = _to_int(scope.get("seasonId"), 0)
        if scope_id_filter and scope_id != scope_id_filter:
            continue
        if season_id_filter > 0 and season_id != season_id_filter:
            continue

        data["id"] = snapshot.id
        grouped[scope_id] = scope
        grouped_matches.setdefault(scope_id, []).append(data)

    rebuilt_scopes: list[dict[str, object]] = []
    for scope_id, scope in grouped.items():
        result = _rebuild_scope_stats(scope, grouped_matches.get(scope_id, []))
        rebuilt_scopes.append(
            {
                "scopeId": scope_id,
                "seasonId": _to_int(scope.get("seasonId"), 0),
                "division": _to_text(scope.get("division"), "LEAGUE"),
                **result,
            }
        )

    return _json_response(
        {
            "ok": True,
            "aggregationVersion": AGGREGATION_VERSION,
            "scopes": rebuilt_scopes,
            "scopeCount": len(rebuilt_scopes),
        }
    )
