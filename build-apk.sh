#!/usr/bin/env bash
# One command: rebuild layers, bundle the single-file HTML, build the debug APK.
#   ./build-apk.sh                   internal (policy) edition
#   ./build-apk.sh install           same, then install on the phone connected over adb
#   ./build-apk.sh public [install]  public edition: only what is marked public (see README)
set -euo pipefail
cd "$(dirname "$0")"
[ -f "$HOME/tools/env.sh" ] && source "$HOME/tools/env.sh"
# Fixed toolchain paths, so the build behaves the same from the normal shell and from
# the isolated event Claude (whose HOME is ~/aic-event/home).
if [ "$(uname)" = Darwin ]; then
  # macOS has no getent; the SDK and JDK live in their standard Mac locations.
  OWNER_HOME="$(dscl . -read "/Users/$(id -un)" NFSHomeDirectory | awk '{print $2}')"
  export ANDROID_HOME="${ANDROID_HOME:-$OWNER_HOME/Library/Android/sdk}"
  export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home)}"
else
  OWNER_HOME="$(getent passwd "$(id -un)" | cut -d: -f6)"
  export ANDROID_HOME="${ANDROID_HOME:-$OWNER_HOME/Android/Sdk}"
  export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
fi
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$OWNER_HOME/.gradle}"
# One debug keystore for every build, so reinstalling over an earlier build works.
export ANDROID_USER_HOME="$(cd .. && pwd)/.android"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

EDITION=internal; INSTALL=no
for arg in "$@"; do
  case "$arg" in
    public) EDITION=public ;;
    install) INSTALL=yes ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

if [ "$EDITION" = public ]; then
  python3 tools/build_public.py
  APK=dist/policy-tool-public-debug.apk; APP_ID=org.aic.policytool.public
else
  python3 tools/build_layers.py
  python3 tools/bundle_html.py
  APK=dist/policy-tool-debug.apk; APP_ID=org.aic.policytool
fi
(cd android && nice -n 19 ./gradlew --max-workers=1 -q :app:assembleDebug -Paudience="$EDITION")
mkdir -p dist
cp android/app/build/outputs/apk/debug/app-debug.apk "$APK"
echo "APK ($EDITION): $(pwd)/$APK ($(du -h "$APK" | cut -f1))"
command -v wslpath >/dev/null && echo "Windows path: $(wslpath -w "$APK")"

if [ "$INSTALL" = yes ]; then
  if command -v wslpath >/dev/null; then
    # WSL can't see USB devices: install through Windows adb (ships with scrcpy).
    if [ "$EDITION" = public ]; then ./install-phone.sh public; else ./install-phone.sh; fi
  else
    adb install -r "$APK"
    adb shell am start -n "$APP_ID/org.aic.policytool.MainActivity"
  fi
fi
