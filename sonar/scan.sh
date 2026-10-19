#!/bin/bash
set -e

# Rodar sempre da raiz do projeto: yarn sonar:scan
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SONAR_URL="http://localhost:9000"

SONAR_ADMIN_PASS="${SONAR_ADMIN_PASS:-BoilerplateSonar2026!}"
AUTH="admin:$SONAR_ADMIN_PASS"

TOKEN_NAME="local-scanner-$(whoami)"

# ── 1. Verifica se SonarQube está acessível ───────────────────────────────────
echo "⏳ Verificando SonarQube em $SONAR_URL..."
if ! curl -sf "$SONAR_URL/api/system/status" 2>/dev/null | grep -q '"status":"UP"'; then
  echo ""
  echo "┌─────────────────────────────────────────────────────────────────┐"
  echo "│  ❌  SonarQube offline ou inacessível em $SONAR_URL  │"
  echo "├─────────────────────────────────────────────────────────────────┤"
  echo "│  👉  Suba o servidor antes de escanear:                         │"
  echo "│                                                                 │"
  echo "│     $ yarn sonar                                                │"
  echo "│                                                                 │"
  echo "│  Isso iniciará o Docker via sonar/start.sh e                    │"
  echo "│  aguardará o SonarQube ficar pronto.                            │"
  echo "└─────────────────────────────────────────────────────────────────┘"
  echo ""
  exit 1
fi
echo "✅ SonarQube pronto."

# ── 2. Configura/reconcilia o Quality Gate ────────────────────────────────────
# setup.sh roda sempre (ADR-0008) — ver comentário equivalente em start.sh.
bash "$SCRIPT_DIR/setup.sh"

# ── 3. Gera token efêmero para este scan ──────────────────────────────────────
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

# ── 4. Roda análise via Docker ────────────────────────────────────────────────
echo ""
echo "📡 Enviando análise para SonarQube..."
docker run --rm \
  --network host \
  -v "$PROJECT_ROOT:/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dproject.settings=/usr/src/sonar/sonar-project.properties \
  -Dsonar.token="$SONAR_TOKEN"

echo ""
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  ✅ Análise concluída! Acesse:                                  │"
echo "│  $SONAR_URL/dashboard?id=nextjs-boilerplate  │"
echo "|                                                                 |"
echo "|  Login: admin                                                   │"
echo "|  Senha admin: $SONAR_ADMIN_PASS                                │"
echo "└─────────────────────────────────────────────────────────────────┘"
