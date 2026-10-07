# Building the HabitGo Android APK — from-scratch toolchain

This project was built and the APK produced with the exact steps below, on a
Windows machine with **no pre-installed Java or Android SDK**. Total toolchain
footprint is roughly 2.5 GB under `C:\habitgo-tools`.

## 1. Install JDK 17 (Temurin)

```powershell
mkdir C:\habitgo-tools; cd C:\habitgo-tools
curl.exe -L -o jdk17.zip "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
tar -xf jdk17.zip
Rename-Item jdk-17* jdk17
```

## 2. Install Android command-line tools + SDK packages

```powershell
cd C:\habitgo-tools
curl.exe -L -o cmdtools.zip "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
tar -xf cmdtools.zip
mkdir android-sdk\cmdline-tools
Move-Item cmdline-tools android-sdk\cmdline-tools\latest

$env:JAVA_HOME = "C:\habitgo-tools\jdk17"
$env:ANDROID_HOME = "C:\habitgo-tools\android-sdk"
yes | android-sdk\cmdline-tools\latest\bin\sdkmanager.bat --licenses
android-sdk\cmdline-tools\latest\bin\sdkmanager.bat "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

(Capacitor 6 targets `compileSdkVersion 34` — see `app/android/variables.gradle`.)

## 3. Point the project at the toolchain

Create `app/android/local.properties`:

```properties
sdk.dir=C\:\\habitgo-tools\\android-sdk
```

and set `JAVA_HOME=C:\habitgo-tools\jdk17` for the build shell.

## 4. Build

```bash
cd app
npm run build            # vite production bundle
npx cap sync android     # copy dist/ + plugins into the native project

cd android
./gradlew assembleDebug                    # first run downloads Gradle + deps (~10 min)
# APK: app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

## 5. Release signing (already configured)

A demo keystore is generated at `app/android/habitgo-demo.keystore` and wired in
`app/android/app/build.gradle` via the `HABITGO_*` environment variables (see the
`signingConfigs.demo` block). For local builds just export:

```bash
export HABITGO_STORE_PASSWORD=habitgo-demo
export HABITGO_KEY_PASSWORD=habitgo-demo
```

or build `assembleDebug`, which is signed automatically with the debug keystore.

> The demo keystore is for testing only — generate a private keystore before any
> public distribution and keep it out of version control.

## 6. Install & test

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

- **Emulator:** the app auto-targets `http://10.0.2.2:4000/api/v1` (host machine).
- **Physical device / distribution:** bake the server URL into the build:
  `set VITE_API_URL=https://<your-host>/api/v1&& npm run build` before `npx cap sync android`
  (there is no runtime server switch in the UI). For LAN testing against your PC:
  `set VITE_API_URL=http://<PC-LAN-IP>:4000/api/v1&& npm run build`.
