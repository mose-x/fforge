; NSIS installer script for fforge
; Usage: makensis /DVERSION=1.0.0 /DASSET_ARCH=x64 /DSRCDIR=build/bin installer.nsi

!include "MUI2.nsh"

!define APP_NAME "fforge"
!define APP_PUBLISHER "mose-x"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"

Name "${APP_NAME}"
OutFile "${SRCDIR}\fforge-${VERSION}-windows-${ASSET_ARCH}-installer.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
; Read the previous install location from the registry so upgrades reuse the
; same dir (e.g. D:\Program Files\fforge) instead of defaulting to C:.
InstallDirRegKey HKLM "${UNINST_KEY}" "InstallLocation"
RequestExecutionLevel admin

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE English

Section "Install"
  ; Kill any running fforge.exe so the installer can overwrite it.
  nsExec::ExecToLog 'taskkill /IM fforge.exe /F'

  SetOutPath "$INSTDIR"
  File "${SRCDIR}\fforge.exe"
  File "${SRCDIR}\ffmpeg.exe"
  File "${SRCDIR}\ffprobe.exe"

  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\fforge.exe"
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\fforge.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "${UNINST_KEY}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "${UNINST_KEY}" "Publisher" "${APP_PUBLISHER}"
  ; Persist the install location so the next upgrade's InstallDirRegKey reads it.
  WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
SectionEnd

Section "Uninstall"
  ; Kill running fforge.exe before uninstalling.
  nsExec::ExecToLog 'taskkill /IM fforge.exe /F'

  Delete "$INSTDIR\fforge.exe"
  Delete "$INSTDIR\ffmpeg.exe"
  Delete "$INSTDIR\ffprobe.exe"
  Delete "$INSTDIR\uninstall.exe"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  RMDir "$INSTDIR"
  DeleteRegKey HKLM "${UNINST_KEY}"
SectionEnd
