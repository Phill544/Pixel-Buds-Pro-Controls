#!/bin/sh
set -e

mkdir -p /backend/out
cp /build/target/release/pbpctrl /backend/out/pbpctrl
echo "pbpctrl binary copied to /backend/out/pbpctrl"
