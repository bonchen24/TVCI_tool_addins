#ifndef MyAppVersion
  #error MyAppVersion must be passed by package-installer.mjs
#endif
#define MyAppName "TVCI Word Tools"

[Setup]
AppId={{8D912CC6-37A5-4B7A-8C41-6F661A999B36}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=TVCI
DefaultDirName={localappdata}\TVCIWordTools
DefaultGroupName={#MyAppName}
PrivilegesRequired=lowest
CloseApplications=no
OutputDir=..\release
OutputBaseFilename=TVCI-Word-Tools-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\app\assets\logo-tvci.png

[Files]
Source: "..\release\staging\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\release\staging\manifest\manifest.xml"; DestDir: "{app}\manifest"; Flags: ignoreversion
Source: "..\release\staging\server\server.js"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "..\release\staging\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs
Source: "..\release\staging\scripts\*"; DestDir: "{app}\scripts"; Excludes: "stop-host.ps1"; Flags: ignoreversion recursesubdirs
Source: "..\release\staging\scripts\stop-host.ps1"; Flags: dontcopy

[Icons]
Name: "{userprograms}\{#MyAppName}\Repair"; Filename: "{app}\repair-installer.exe"
Name: "{userprograms}\{#MyAppName}\Check Status"; Filename: "powershell.exe"; Parameters: "-NoProfile -NoExit -ExecutionPolicy Bypass -File ""{app}\scripts\verify.ps1"""
Name: "{userprograms}\{#MyAppName}\Open Logs"; Filename: "explorer.exe"; Parameters: """{app}\logs"""
Name: "{userprograms}\{#MyAppName}\Uninstall"; Filename: "{uninstallexe}"

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\uninstall.ps1"""; Flags: runhidden waituntilterminated; RunOnceId: "TVCIUserCleanup"

[UninstallDelete]
Type: files; Name: "{app}\repair-installer.exe"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := IsWin64;
  if not Result then
    MsgBox('Windows x86 khong duoc ho tro. Bo cai nay chua x64 runtime.', mbCriticalError, MB_OK);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
  Script: String;
begin
  Result := '';
  ExtractTemporaryFile('stop-host.ps1');
  Script := ExpandConstant('{tmp}\stop-host.ps1');
  if (not Exec(ExpandConstant('{sysnative}\WindowsPowerShell\v1.0\powershell.exe'), '-NoProfile -ExecutionPolicy Bypass -File "' + Script + '" -InstallDir "' + ExpandConstant('{app}') + '"', '', SW_HIDE, ewWaitUntilTerminated, Code)) or (Code <> 0) then
    Result := 'Cannot stop the existing TVCI host before upgrading. Close the host and try again.';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Code: Integer;
  Script: String;
  SourceExe: String;
  RepairExe: String;
  CacheOk: Boolean;
  Failure: String;
  FailureAnsi: AnsiString;
begin
  if CurStep = ssPostInstall then
  begin
    SourceExe := ExpandConstant('{srcexe}');
    RepairExe := ExpandConstant('{app}\repair-installer.exe');
    CacheOk := CompareText(SourceExe, RepairExe) = 0;
    if not CacheOk then
      CacheOk := CopyFile(SourceExe, RepairExe, False);
    Script := ExpandConstant('{app}\scripts\setup.ps1');
    if (not Exec(ExpandConstant('{sysnative}\WindowsPowerShell\v1.0\powershell.exe'), '-NoProfile -ExecutionPolicy Bypass -File "' + Script + '"', '', SW_HIDE, ewWaitUntilTerminated, Code)) or (Code <> 0) then
    begin
      Failure := 'Setup process exited with code ' + IntToStr(Code);
      if LoadStringFromFile(ExpandConstant('{app}\logs\setup-failure.txt'), FailureAnsi) then
        Failure := Trim(String(FailureAnsi));
      MsgBox('TVCI Word Tools chua READY: ' + Failure + #13#10 +
        'Log: ' + ExpandConstant('{app}\logs\setup.log'), mbCriticalError, MB_OK);
    end
    else if not CacheOk then
      MsgBox('TVCI da cai nhung khong luu duoc bo cai cho Repair. Hay giu file Setup EXE de cai lai khi can.', mbCriticalError, MB_OK)
    else
      MsgBox('TVCI Word Tools READY. Hay dong va mo lai Word neu Word dang mo.', mbInformation, MB_OK);
  end;
end;
