#!/usr/bin/env bash
# One-shot Stripe setup for Forja (test mode).
# Creates the 3 subscription prices, asks for your secret key, and writes them all to .env.
# Run from backend/:   bash setup-stripe.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$DIR/.env"

# Make sure .env exists.
if [ ! -f "$ENV_FILE" ]; then
  cp "$DIR/.env.example" "$ENV_FILE"
  echo "Created $ENV_FILE from .env.example"
fi

# Need the Stripe CLI, logged in.
if ! command -v stripe >/dev/null 2>&1; then
  echo "Stripe CLI not found. Install it first:"
  echo "  brew install stripe/stripe-cli/stripe && stripe login"
  exit 1
fi

# Replace a KEY=... line in .env, or append it if missing (portable macOS sed).
set_env() {
  local k="$1" v="$2"
  if grep -q "^$k=" "$ENV_FILE"; then
    sed -i '' "s|^$k=.*|$k=$v|" "$ENV_FILE"
  else
    echo "$k=$v" >> "$ENV_FILE"
  fi
}

# Create one monthly price and print just its price_... id.
create_price() { # amount-in-cents  name
  stripe prices create \
    --unit-amount "$1" --currency eur \
    -d "recurring[interval]=month" \
    -d "product_data[name]=$2" \
  | python3 -c "import sys,re;m=re.search(r'\"id\":\s*\"(price_[A-Za-z0-9]+)\"',sys.stdin.read());print(m.group(1) if m else '')"
}

echo "Creating Stripe prices (test mode)…"
SOLO=$(create_price 1900 "Forja Solo")
STUDIO=$(create_price 4900 "Forja Studio")
AGENCY=$(create_price 9900 "Forja Agency")

for pair in "Solo:$SOLO" "Studio:$STUDIO" "Agency:$AGENCY"; do
  name="${pair%%:*}"; id="${pair##*:}"
  if [ -z "$id" ]; then
    echo "Could not read the $name price id from Stripe. Are you logged in (stripe login)?"
    exit 1
  fi
done

set_env STRIPE_PRICE_SOLO "$SOLO"
set_env STRIPE_PRICE_STUDIO "$STUDIO"
set_env STRIPE_PRICE_AGENCY "$AGENCY"
set_env TRIAL_DAYS 14

echo
echo "Paste your Stripe SECRET key (sk_test_… from https://dashboard.stripe.com/test/apikeys)."
echo "Press Enter to skip if it's already set in .env."
read -r -s -p "STRIPE_SECRET_KEY: " SK
echo
if [ -n "${SK:-}" ]; then
  set_env STRIPE_SECRET_KEY "$SK"
fi

echo
echo "Done. Wrote to $ENV_FILE:"
echo "  STRIPE_PRICE_SOLO=$SOLO"
echo "  STRIPE_PRICE_STUDIO=$STUDIO"
echo "  STRIPE_PRICE_AGENCY=$AGENCY"
echo "  TRIAL_DAYS=14"
[ -n "${SK:-}" ] && echo "  STRIPE_SECRET_KEY=sk_test_… (set)"
echo
echo "Next: restart the backend so it loads .env:"
echo "  lsof -ti:8010 | xargs kill -9 2>/dev/null"
echo "  source .venv/bin/activate && uvicorn app.main:app --reload --port 8010"
