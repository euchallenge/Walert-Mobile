#!/usr/bin/env bash
# Install the built APK on a USB-connected phone (USB debugging on), using the adb that
# ships with scrcpy on Windows (WSL itself cannot see USB devices). Then mirror with scrcpy.
#   ./install-phone.sh          install + start
#   ./install-phone.sh mirror   also open scrcpy (phone screen on the laptop, for the demo)
#   ./install-phone.sh public [mirror]   the public edition instead (build it with ./build-apk.sh public)
set -euo pipefail
cd "$(dirname "$0")"
SCRCPY_DIR="$(ls -d /mnt/c/Users/*/AppData/Local/Microsoft/WinGet/Packages/Genymobile.scrcpy*/scrcpy-win64-* | head -1)"
ADB="$SCRCPY_DIR/adb.exe"
APK=dist/policy-tool-debug.apk; APP_ID=org.aic.policytool; MIRROR=no
for arg in "$@"; do
  case "$arg" in
    public) APK=dist/policy-tool-public-debug.apk; APP_ID=org.aic.policytool.public ;;
    mirror) MIRROR=yes ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done
APK_WIN="$(wslpath -w "$APK")"
"$ADB" devices
"$ADB" install -r "$APK_WIN"
"$ADB" shell am start -n "$APP_ID/org.aic.policytool.MainActivity"
[ "$MIRROR" = yes ] && "$SCRCPY_DIR/scrcpy.exe" --stay-awake &
exit 0
