# Android downloads

The website advertises `SOUK-SCAN-v1.1.1.apk` (versionCode 5), built and signed by
the main app repository's `v1.1.1` release workflow from commit `0234ea7`.
`SHA256SUMS.txt` records the file's SHA-256. The signing-certificate SHA-256 is:

```text
c98568d41722dd647aa4cd87e541ad4b5d051f0a7fb918adc6bc628fa328a83e
```

The existing v1.0.2 APK and checksums are retained so old direct links keep
working. Its AAB is not hosted here. The current AAB is available to repository
collaborators through the app's GitHub Release for manual Play Console upload;
it is not an installable website download.

When updating, obtain the APK from the signed release, verify the checksum and
certificate, and update the home template, locale captions, checksum manifest
and download test together. Never replace an APK with a debug-signed build.
