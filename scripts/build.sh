#!/usr/bin/env bash
set -e

echo "=== [1/2] Building FundCircle Soroban Smart Contracts ==="
cargo build --target wasm32-unknown-unknown --release

echo "=== [2/2] Verifying WASM Artifacts ==="
ls -lh target/wasm32-unknown-unknown/release/*.wasm

echo "✅ Soroban contract build complete!"
