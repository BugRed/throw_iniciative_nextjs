#!/bin/bash
set -e

SONAR_URL="http://localhost:9000"
GATE_NAME="Boilerplate Gate"

SONAR_ADMIN_PASS="${SONAR_ADMIN_PASS:-BoilerplateSonar2026!}"

echo "⏳ Aguardando SonarQube estar pronto..."
until curl -sf "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; do
  sleep 5
done
echo "✅ SonarQube pronto."

# ── Detecta credenciais válidas ───────────────────────────────────────────────
echo "🔐 Verificando credenciais de admin..."

AUTH=""

# /api/system/status é endpoint público — responde 200 com qualquer credencial
# (ou nenhuma), então nunca serve pra detectar senha. /api/qualitygates/list
# exige auth de verdade (401 com credencial errada), por isso é o teste aqui —
# roda em todo `yarn sonar`/`sonar:scan` agora (ADR-0008), então precisa
# distinguir "senha ainda é a padrão" de "senha já foi trocada" de verdade, não
# só "o servidor está de pé".
if curl -sf -u "admin:admin" "$SONAR_URL/api/qualitygates/list" > /dev/null 2>&1; then
  echo "   → Senha padrão detectada. Trocando..."
  HTTP=$(curl -so /dev/null -w "%{http_code}" -u "admin:admin" -X POST \
    "$SONAR_URL/api/users/change_password" \
    -d "login=admin&previousPassword=admin&password=$SONAR_ADMIN_PASS" 2>/dev/null)
  if [ "$HTTP" = "204" ]; then
    echo "   ✅ Senha trocada com sucesso."
    AUTH="admin:$SONAR_ADMIN_PASS"
  else
    echo "   ❌ HTTP $HTTP ao trocar senha (mínimo 12 chars?). Abortando."
    exit 1
  fi
elif curl -sf -u "admin:$SONAR_ADMIN_PASS" "$SONAR_URL/api/qualitygates/list" > /dev/null 2>&1; then
  echo "   ✅ Senha já configurada."
  AUTH="admin:$SONAR_ADMIN_PASS"
else
  echo "   ❌ Credenciais inválidas. Rode 'yarn sonar:down' e tente novamente."
  exit 1
fi

# ── Criar Quality Gate ────────────────────────────────────────────────────────
echo "📐 Verificando Quality Gate '$GATE_NAME'..."

EXISTING=$(curl -sf -u "$AUTH" "$SONAR_URL/api/qualitygates/list" 2>/dev/null | \
  python3 -c "
import sys, json
gates = json.load(sys.stdin).get('qualitygates', [])
print(next((g['name'] for g in gates if g['name'] == '$GATE_NAME'), ''))
" 2>/dev/null || true)

if [ "$EXISTING" = "$GATE_NAME" ]; then
  echo "   ✅ Quality Gate '$GATE_NAME' já existe."
else
  curl -sf -u "$AUTH" -X POST \
    "$SONAR_URL/api/qualitygates/create" \
    --data-urlencode "name=$GATE_NAME" > /dev/null || true
  echo "   ✅ Quality Gate criado."
fi

# ── Atualiza new_coverage CAYC 80% → 70% ─────────────────────────────────────
GATE_JSON=$(curl -sf -u "$AUTH" \
  "$SONAR_URL/api/qualitygates/show?name=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$GATE_NAME'))")" 2>/dev/null || echo "{}")

NEW_COVERAGE_ID=$(echo "$GATE_JSON" | python3 -c \
  "import sys,json
data=json.load(sys.stdin)
cs=data.get('conditions',[])
print(next((c['id'] for c in cs if c['metric']=='new_coverage'), ''))" 2>/dev/null || true)

if [ -n "$NEW_COVERAGE_ID" ]; then
  echo "   → Atualizando new_coverage CAYC: 80% → 70%"
  curl -sf -u "$AUTH" -X POST \
    "$SONAR_URL/api/qualitygates/update_condition" \
    -d "id=$NEW_COVERAGE_ID&metric=new_coverage&op=LT&error=70" > /dev/null || true
fi

# ── Condições extras ──────────────────────────────────────────────────────────
add_condition() {
  local METRIC=$1 OP=$2 ERROR=$3
  echo "   → $METRIC $OP $ERROR"
  curl -sf -u "$AUTH" -X POST \
    "$SONAR_URL/api/qualitygates/create_condition" \
    -d "gateName=$GATE_NAME&metric=$METRIC&op=$OP&error=$ERROR" > /dev/null || true
}

echo "📋 Adicionando condições..."
add_condition "coverage"                 "LT" "70"
add_condition "security_rating"          "GT" "1"
add_condition "new_security_rating"      "GT" "1"
add_condition "reliability_rating"       "GT" "2"
add_condition "new_reliability_rating"   "GT" "2"
add_condition "sqale_rating"             "GT" "1"
add_condition "blocker_violations"       "GT" "0"
add_condition "critical_violations"      "GT" "0"
# Piso de duplicação (ADR-0008) — mesmo limite que o eslint-plugin-sonarjs já
# aplica local no yarn lint; aqui é a rede de segurança em nível de projeto
# inteiro (pega duplicação entre arquivos que o lint por arquivo não vê).
add_condition "duplicated_lines_density" "GT" "3"

echo "⭐ Definindo '$GATE_NAME' como Quality Gate padrão..."
curl -sf -u "$AUTH" -X POST \
  "$SONAR_URL/api/qualitygates/set_as_default" \
  -d "name=$GATE_NAME" > /dev/null || true

echo "✅ Quality Gate configurado! Acesse: $SONAR_URL/quality_gates"

# ── Perfil de qualidade CSS — Tailwind v4 (ADR-0008) ─────────────────────────
# O perfil padrão "Sonar way" não reconhece at-rules do Tailwind CSS v4
# (@theme, usada pelo setup padrão do Next.js 16) na regra css:S4662 — reporta
# como bug e derruba o reliability_rating. NOSONAR inline não suprime esse
# tipo de issue neste analisador, então a correção é no perfil: uma cópia
# editável do "Sonar way" com a lista de at-rules ignorados estendida.
echo "🎨 Verificando perfil de qualidade CSS..."

CSS_PROFILE_NAME="Boilerplate Way"
CSS_PROFILES=$(curl -sf -u "$AUTH" "$SONAR_URL/api/qualityprofiles/search?language=css" 2>/dev/null || echo "{}")

BOILERPLATE_CSS_KEY=$(echo "$CSS_PROFILES" | python3 -c "
import sys, json
profiles = json.load(sys.stdin).get('profiles', [])
print(next((p['key'] for p in profiles if p['name'] == '$CSS_PROFILE_NAME'), ''))
" 2>/dev/null || true)

if [ -z "$BOILERPLATE_CSS_KEY" ]; then
  SONAR_WAY_CSS_KEY=$(echo "$CSS_PROFILES" | python3 -c "
import sys, json
profiles = json.load(sys.stdin).get('profiles', [])
print(next((p['key'] for p in profiles if p['isBuiltIn']), ''))
" 2>/dev/null || true)

  echo "   🆕 Copiando perfil padrão (CSS) para '$CSS_PROFILE_NAME'..."
  curl -sf -u "$AUTH" -X POST "$SONAR_URL/api/qualityprofiles/copy" \
    --data-urlencode "fromKey=$SONAR_WAY_CSS_KEY" \
    --data-urlencode "toName=$CSS_PROFILE_NAME" > /dev/null || true

  BOILERPLATE_CSS_KEY=$(curl -sf -u "$AUTH" "$SONAR_URL/api/qualityprofiles/search?language=css" 2>/dev/null | \
    python3 -c "
import sys, json
profiles = json.load(sys.stdin).get('profiles', [])
print(next((p['key'] for p in profiles if p['name'] == '$CSS_PROFILE_NAME'), ''))
" 2>/dev/null || true)
else
  echo "   ✅ Perfil '$CSS_PROFILE_NAME' (CSS) já existe."
fi

IGNORE_AT_RULES="value,at-root,content,debug,each,else,error,for,function,if,include,mixin,return,warn,while,extend,use,forward,tailwind,apply,layer,container,theme,utility,custom-variant,source,plugin,variant,reference,config,slot"

if [ -n "$BOILERPLATE_CSS_KEY" ]; then
  curl -sf -u "$AUTH" -X POST "$SONAR_URL/api/qualityprofiles/activate_rule" \
    --data-urlencode "key=$BOILERPLATE_CSS_KEY" \
    --data-urlencode "rule=css:S4662" \
    --data-urlencode "params=ignoreAtRules=$IGNORE_AT_RULES" > /dev/null || true

  curl -sf -u "$AUTH" -X POST "$SONAR_URL/api/qualityprofiles/set_default" \
    --data-urlencode "qualityProfile=$CSS_PROFILE_NAME" \
    --data-urlencode "language=css" > /dev/null || true

  echo "   ✅ Perfil CSS configurado e definido como padrão."
else
  echo "   ❌ Não foi possível localizar/criar o perfil CSS '$CSS_PROFILE_NAME'."
fi
