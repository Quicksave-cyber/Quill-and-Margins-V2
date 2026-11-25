# Build the Android app (from your phone)

The APK is built free by GitHub. Package name: `com.quillandmargin.app`
Debug key SHA-1 (for Firebase): `45:3C:13:2A:DF:07:0B:8C:D7:C6:C1:FA:79:8B:71:CE:F6:32:1E:23`

## 1. Firebase (so Google sign-in works)
1. Firebase console > Project settings (gear) > Your apps > Add app > Android.
2. Package name: `com.quillandmargin.app`. Add the SHA-1 above. Register, then download `google-services.json`.
3. If you registered without the SHA-1: Project settings > your Android app > Add fingerprint, paste it, then download `google-services.json` again.

## 2. GitHub
1. Create a free account at github.com, then New repository (private is fine).
2. Add file > Upload files. Select every file from this folder, including `google-services.json`, and commit.
3. Add file > Create new file. Name it `.github/workflows/android.yml` (typing the slashes makes the folders). Paste the whole contents of `android-workflow.yml` and commit.

## 3. Build
1. Actions tab > Build Android APK > Run workflow. Wait about 5-10 minutes.
2. Open the finished run > Artifacts > `quill-and-margin-apk`. Extract the zip and install `app-debug.apk` (allow installs from unknown sources).
3. On first open, allow notifications.

## Notes
- Notifications arrive while the app is open or recently in the background. Fully closed apps need a paid Firebase plan and a server, which this setup does not use.
- Update the app: replace `app.js` / `style.css` etc. in the repo and run the workflow again. Keep `debug.keystore` so the SHA-1 stays the same.
- Phone Back button works as in any app.
