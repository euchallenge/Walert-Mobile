#!/usr/bin/env bash
# Install the built APK on every USB-connected phone (USB debugging on), using the adb that
# ships with scrcpy on Windows (WSL itself cannot see USB devices). Then mirror with scrcpy.
# Each phone also gets `adb reverse tcp:8765`, so the app reaches the demo message relay
# (tools/relay_server.py) on the laptop as http://localhost:8765.
#   ./install-phone.sh          install + start on all connected phones
#   ./install-phone.sh mirror   also open scrcpy (phone screen on the laptop, for the demo)
#   ./install-phone.sh public [mirror]   the public edition instead (build it with ./build-apk.sh public)
#   ./install-phone.sh video | text      one of the A/B test apps (build with ./build-apk.sh video / text);
#                                        run both to have them side by side on the phone
set -euo pipefail
cd "$(dirname "$0")"
SCRCPY_DIR="$(ls -d /mnt/c/Users/*/AppData/Local/Microsoft/WinGet/Packages/Genymobile.scrcpy*/scrcpy-win64-* | head -1)"
ADB="$SCRCPY_DIR/adb.exe"
APK=dist/policy-tool-debug.apk; APP_ID=org.aic.policytool; MIRROR=no
for arg in "$@"; do
  case "$arg" in
    public) APK=dist/policy-tool-public-debug.apk; APP_ID=org.aic.policytool.public ;;
    video|text) APK=dist/policy-tool-$arg-debug.apk; APP_ID=org.aic.policytool.$arg ;;
    mirror) MIRROR=yes ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done
APK_WIN="$(wslpath -w "$APK")"
"$ADB" devices
SERIALS=$("$ADB" devices | tr -d '\r' | awk 'NR > 1 && $2 == "device" {print $1}')
[ -z "$SERIALS" ] && { echo "No phone found: plug it in and allow USB debugging." >&2; exit 1; }
for s in $SERIALS; do
  echo "== $s"
  "$ADB" -s "$s" install -r "$APK_WIN"
  "$ADB" -s "$s" reverse tcp:8765 tcp:8765
  "$ADB" -s "$s" shell am start -n "$APP_ID/org.aic.policytool.MainActivity"
done
[ "$MIRROR" = yes ] && "$SCRCPY_DIR/scrcpy.exe" --stay-awake &
exit 0
