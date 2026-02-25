#!/usr/bin/env bash
set -e

echo "Clearing file contents..."

echo "[]" > data/clean/offers_clean.json
echo "[]" > data/rejects/offers_rejected.json
echo "[]" > data/raw/bank_cd.json
echo "[]" > data/raw/brokered_cd.json
echo "[]" > data/raw/treasury.json

: > data/raw/bankrate.html
: > data/raw/treasury.csv
: > data/raw/brokered_cd_raw.json

echo "✅ Files cleared but not deleted."

#for daily use : ./scripts/clear_data.sh