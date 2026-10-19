#!/bin/bash
set -e

# Rodar sempre da raiz do projeto: yarn sonar
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SONAR_URL="http://localhost:9000"

SONAR_ADMIN_PASS="${SONAR_ADMIN_PASS:-BoilerplateSonar2026!}"
AUTH="admin:$SONAR_ADMIN_PASS"

TOKEN_NAME="local-scanner-$(whoami)"

# ── 1. Sobe SonarQube ────────────────────────────────────────────────────────
echo "🐳 Subindo SonarQube..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d

echo "⏳ Aguardando SonarQube iniciar (pode levar até 2min)..."
until curl -sf "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; do
  printf "."
  sleep 5
done
echo ""
echo "✅ SonarQube pronto."

# ── 2. Configura/reconcilia o Quality Gate ───────────────────────────────────
# setup.sh roda sempre (ADR-0008): ele mesmo é idempotente (só cria o gate se
# faltar, e repetir add_condition num metric que já tem condição é no-op
# silencioso). Rodar sempre é o que garante que uma condição nova (ex.:
# duplicated_lines_density) chegue também em quem já tinha o gate criado antes
# dela existir neste script — pular essa chamada quando o gate já existe foi
# exatamente o bug que deixou a condição de duplicação sem efeito.
bash "$SCRIPT_DIR/setup.sh"

# ── 3. Gera token efêmero para este scan ─────────────────────────────────────
echo "🔑 Gerando token de acesso..."
curl -s -u "$AUTH" -X POST "$SONAR_URL/api/user_tokens/revoke" \
  -d "name=$TOKEN_NAME" > /dev/null 2>&1 || true

TOKEN_RESPONSE=$(curl -s -u "$AUTH" -X POST "$SONAR_URL/api/user_tokens/generate" \
  -d "name=$TOKEN_NAME&type=USER_TOKEN")

SONAR_TOKEN=$(echo "$TOKEN_RESPONSE" | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null || true)

if [ -z "$SONAR_TOKEN" ]; then
  echo "❌ Falha ao gerar token. Resposta da API:"
  echo "$TOKEN_RESPONSE"
  exit 1
fi
echo "✅ Token gerado."

# ── 4. Roda análise via Docker ───────────────────────────────────────────────
echo ""
echo "📡 Enviando análise para SonarQube..."
docker run --rm \
  --network host \
  -v "$PROJECT_ROOT:/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dproject.settings=/usr/src/sonar/sonar-project.properties \
  -Dsonar.token="$SONAR_TOKEN"

echo ""
echo "✅ Análise concluída! Acesse: $SONAR_URL/dashboard?id=nextjs-boilerplate"
