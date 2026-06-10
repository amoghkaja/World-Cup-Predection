#!/usr/bin/env bash
# Live server-side audit: verifies picks persist in Postgres and RLS/grants
# actually block forgery. Creates a throwaway auth user, exercises every write
# path with a real user JWT, then deletes the user. Never prints secrets.
set -u
cd "$(dirname "$0")/.."

env_get() { grep -m1 "^$1=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'"; }
URL=$(env_get NEXT_PUBLIC_SUPABASE_URL)
ANON=$(env_get NEXT_PUBLIC_SUPABASE_ANON_KEY)
SRV=$(env_get SUPABASE_SERVICE_ROLE_KEY)

pass=0; fail=0
ok()  { pass=$((pass+1)); echo "  PASS  $1"; }
bad() { fail=$((fail+1)); echo "  FAIL  $1"; }

srv() { # method path [json]
  local m=$1 p=$2 b=${3:-}
  curl -s -X "$m" "$URL$p" -H "apikey: $SRV" -H "Authorization: Bearer $SRV" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" ${b:+-d "$b"}
}
usr() { # method path token [json] -> body; appends \n%{http_code}
  local m=$1 p=$2 t=$3 b=${4:-}
  curl -s -w '\n%{http_code}' -X "$m" "$URL$p" -H "apikey: $ANON" -H "Authorization: Bearer $t" \
    -H "Content-Type: application/json" -H "Prefer: return=representation" ${b:+-d "$b"}
}

echo "== 1. Real users' picks actually stored (service-role read) =="
srv GET "/rest/v1/profiles?select=id,display_name" > /tmp/profiles.json
N_USERS=$(jq length /tmp/profiles.json)
echo "  users: $N_USERS"
for uid in $(jq -r '.[].id' /tmp/profiles.json); do
  name=$(jq -r ".[] | select(.id==\"$uid\") | .display_name" /tmp/profiles.json)
  pod=$(srv GET "/rest/v1/podium_predictions?user_id=eq.$uid&select=position,team_id" | jq 'length')
  grp=$(srv GET "/rest/v1/group_predictions?user_id=eq.$uid&pred_winner_team_id=not.is.null&pred_runnerup_team_id=not.is.null&select=id" | jq 'length')
  gb=$(srv GET "/rest/v1/tournament_predictions?user_id=eq.$uid&type=eq.golden_boot&select=text_value" | jq -r '.[0].text_value // "—"')
  mp=$(srv GET "/rest/v1/predictions?user_id=eq.$uid&select=id" | jq 'length')
  echo "  $name: podium=$pod/3-rows groups=$grp/12 goldenBoot='$gb' matchPreds=$mp"
done

echo "== 2. Create throwaway test user =="
TEST_EMAIL="rls-audit-$(date +%s)@example.com"
TEST_PW="aud!T-$(date +%s%N | tail -c 10)"
CREATED=$(srv POST "/auth/v1/admin/users" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PW\",\"email_confirm\":true}")
TUID=$(echo "$CREATED" | jq -r '.id // empty')
[ -n "$TUID" ] && ok "test user created" || { bad "could not create test user"; echo "$CREATED" | jq -c 'del(.email)'; exit 1; }

TOKEN=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" \
  -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PW\"}" | jq -r '.access_token // empty')
[ -n "$TOKEN" ] && ok "signed in as test user" || { bad "sign-in failed"; }

cleanup() { srv DELETE "/auth/v1/admin/users/$TUID" >/dev/null; echo "  (test user deleted)"; }
trap cleanup EXIT

echo "== 3. Privilege escalation attempts (must all be blocked) =="
R=$(usr PATCH "/rest/v1/profiles?id=eq.$TUID" "$TOKEN" '{"is_admin":true}')
ISADMIN=$(srv GET "/rest/v1/profiles?id=eq.$TUID&select=is_admin" | jq -r '.[0].is_admin')
[ "$ISADMIN" = "false" ] && ok "cannot self-promote to admin (is_admin still false)" \
  || bad "SELF-PROMOTED TO ADMIN — is_admin=$ISADMIN (http $(echo "$R" | tail -1))"

R=$(usr POST "/rest/v1/predictions" "$TOKEN" '{"user_id":"'$TUID'","match_id":1,"pred_home_score":1,"pred_away_score":0,"pred_outcome":"home","points_awarded":999,"scored":true}')
CODE=$(echo "$R" | tail -1)
if [ "$CODE" -ge 400 ]; then ok "cannot insert prediction with forged points (http $CODE)"
else
  PTS=$(srv GET "/rest/v1/predictions?user_id=eq.$TUID&match_id=eq.1&select=points_awarded" | jq -r '.[0].points_awarded')
  [ "$PTS" = "0" ] && ok "forged points ignored (stored 0)" || bad "FORGED POINTS STORED: $PTS"
  srv DELETE "/rest/v1/predictions?user_id=eq.$TUID&match_id=eq.1" >/dev/null
fi

R=$(usr POST "/rest/v1/group_predictions" "$TOKEN" '{"user_id":"'$TUID'","group_label":"A","pred_winner_team_id":1,"pred_runnerup_team_id":2,"points_awarded":99,"scored":true}')
CODE=$(echo "$R" | tail -1)
if [ "$CODE" -ge 400 ]; then ok "cannot forge group points (http $CODE)"
else
  PTS=$(srv GET "/rest/v1/group_predictions?user_id=eq.$TUID&group_label=eq.A&select=points_awarded" | jq -r '.[0].points_awarded')
  [ "$PTS" = "0" ] && ok "forged group points ignored (stored 0)" || bad "FORGED GROUP POINTS STORED: $PTS"
fi

R=$(usr POST "/rest/v1/podium_predictions" "$TOKEN" '{"user_id":"'$TUID'","position":1,"team_id":1,"revised":false,"points_awarded":50,"scored":true}')
CODE=$(echo "$R" | tail -1)
[ "$CODE" -ge 400 ] && ok "cannot write podium table directly (http $CODE)" || bad "DIRECT PODIUM WRITE ALLOWED"

R=$(usr PATCH "/rest/v1/profiles?id=eq.$(jq -r '.[0].id' /tmp/profiles.json)" "$TOKEN" '{"display_name":"hacked"}')
HACKED=$(srv GET "/rest/v1/profiles?display_name=eq.hacked&select=id" | jq 'length')
[ "$HACKED" = "0" ] && ok "cannot edit other users' profiles" || bad "EDITED ANOTHER USER'S PROFILE"

echo "== 4. Legit user writes persist server-side =="
R=$(usr POST "/rest/v1/rpc/save_podium_pick" "$TOKEN" '{"p_position":1,"p_team_id":5}')
POD=$(srv GET "/rest/v1/podium_predictions?user_id=eq.$TUID&position=eq.1&select=team_id,original_team_id,revised" | jq -c '.[0]')
[ "$(echo "$POD" | jq -r '.team_id')" = "5" ] && ok "champion pick persisted via RPC: $POD" || bad "champion pick NOT stored: $POD (http $(echo "$R" | tail -1))"

R=$(usr POST "/rest/v1/group_predictions?on_conflict=user_id,group_label" "$TOKEN" '{"user_id":"'$TUID'","group_label":"B","pred_winner_team_id":5,"pred_runnerup_team_id":6,"submitted_at":"2026-06-10T00:00:00Z"}')
GRP=$(srv GET "/rest/v1/group_predictions?user_id=eq.$TUID&group_label=eq.B&select=pred_winner_team_id" | jq -r '.[0].pred_winner_team_id')
[ "$GRP" = "5" ] && ok "group pick persisted" || bad "group pick NOT stored (http $(echo "$R" | tail -1))"

R=$(usr POST "/rest/v1/tournament_predictions" "$TOKEN" '{"user_id":"'$TUID'","type":"golden_boot","text_value":"Kylian Mbappé","submitted_at":"2026-06-10T00:00:00Z"}')
GB=$(srv GET "/rest/v1/tournament_predictions?user_id=eq.$TUID&type=eq.golden_boot&select=text_value" | jq -r '.[0].text_value')
[ "$GB" = "Kylian Mbappé" ] && ok "golden boot persisted" || bad "golden boot NOT stored (http $(echo "$R" | tail -1))"

R=$(usr POST "/rest/v1/predictions" "$TOKEN" '{"user_id":"'$TUID'","match_id":1,"pred_home_score":2,"pred_away_score":1,"pred_outcome":"home","submitted_at":"2026-06-10T00:00:00Z"}')
MP=$(srv GET "/rest/v1/predictions?user_id=eq.$TUID&match_id=eq.1&select=pred_home_score,points_awarded" | jq -c '.[0]')
[ "$(echo "$MP" | jq -r '.pred_home_score')" = "2" ] && ok "match prediction persisted: $MP" || bad "match prediction NOT stored (http $(echo "$R" | tail -1))"

echo "== 5. Pre-lock privacy: another user's picks are hidden =="
PEEK_UID=$(jq -r '.[0].id' /tmp/profiles.json)
SEEN=$(usr GET "/rest/v1/tournament_predictions?user_id=eq.$PEEK_UID&select=text_value" "$TOKEN" | head -1 | jq 'length')
[ "$SEEN" = "0" ] && ok "other users' tournament picks hidden before lock" || bad "CAN SEE OTHERS' PICKS PRE-LOCK ($SEEN rows)"
SEEN=$(usr GET "/rest/v1/predictions?user_id=eq.$PEEK_UID&select=id" "$TOKEN" | head -1 | jq 'length')
[ "$SEEN" = "0" ] && ok "other users' match predictions hidden before kickoff" || bad "CAN SEE OTHERS' MATCH PREDICTIONS PRE-KICKOFF ($SEEN rows)"

echo
echo "RESULT: $pass passed, $fail failed"
