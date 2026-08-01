; NSIS installer script for fforge
; Usage: makensis /DVERSION=1.0.0 /DASSET_ARCH=x64 /DSRCDIR=build/bin installer.nsi

!include "MUI2.nsh"

!define APP_NAME "fforge"
!define APP_PUBLISHER "mose-x"

Name "${APP_NAME}"
OutFile "${SRCDIR}\fforge-${VERSION}-windows-${ASSET_ARCH}-installer.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
RequestExecutionLevel admin

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE English

Section "Install"
  SetOutPath "$INSTDIR"
  File "${SRCDIR}\fforge.exe"
  File "${SRCDIR}\ffmpeg.exe"
  File "${SRCDIR}\ffprobe.exe"

  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\fforge.exe"
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\fforge.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\fforge.exe"
  Delete "$INSTDIR\ffmpeg.exe"
  Delete "$INSTDIR\ffprobe.exe"
  Delete "$INSTDIR\uninstall.exe"
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  RMDir "$INSTDIR"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd
