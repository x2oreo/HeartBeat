#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -f "Secrets.xcconfig" ]; then
  cp Secrets.xcconfig.example Secrets.xcconfig
  echo "Created Secrets.xcconfig — fill in SUPABASE_URL and SUPABASE_ANON_KEY before building."
fi

if ! command -v xcodegen &>/dev/null; then
  echo "Installing XcodeGen via Homebrew..."
  brew install xcodegen
fi

xcodegen generate
echo "Done! Open HeartBeatWatch.xcodeproj in Xcode."
echo "Set your Team in Signing & Capabilities before running on a real device."
