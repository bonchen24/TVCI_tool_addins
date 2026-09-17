; Inno Setup Script cho TVCI Word Tools
; Ho tro day du vong doi: Install, Repair, Uninstall, Update (100% Offline Standalone)

#define MyAppName "TVCI Word Tools"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "TVCI - IEMM"
#define MyAppURL "https://tvci.vn"
#define MyAppExeName "tvci-host.exe"
#define MyAppId "{{8D912CC6-37A5-4B7A-8C41-6F661A999B36}}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\release
OutputBaseFilename=TVCI_Word_Addin_Setup_v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
CloseApplications=force
UninstallDisplayIcon={app}\assets\icon-32.png
ShowLanguageDialog=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "startup"; Description: "Tự động khởi động dịch vụ ngầm cùng Windows (Khuyên dùng)"; GroupDescription: "Tùy chọn bổ sung:"

[Files]
Source: "MicrosoftEdgeWebview2Setup.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\release\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\release\tvci-cert.pfx"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\release\ca.crt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\manifest\manifest.xml"; DestDir: "{app}"; Flags: ignoreversion
Source: "repair.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall.cmd"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\HUONG_DAN_CAI_DAT_VA_SU_DUNG_TVCI_WORD_ADDIN.docx"; DestDir: "{app}"; Flags: ignoreversion isreadme
; Toan bo file dist duoc copy truc tiep vao thu muc goc {app} de tvci-host luon tim thay taskpane.html
Source: "..\dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}\Tài liệu Hướng dẫn sử dụng"; Filename: "{app}\HUONG_DAN_CAI_DAT_VA_SU_DUNG_TVCI_WORD_ADDIN.docx"
Name: "{autoprograms}\{#MyAppName}\Sửa chữa Add-in (Repair)"; Filename: "{app}\repair.cmd"
Name: "{autoprograms}\{#MyAppName}\Gỡ cài đặt (Uninstall)"; Filename: "{uninstallexe}"

[Registry]
; Dang ky Add-in vao Microsoft Word Developer WEF (ca HKCU va HKLM, ca 32-bit va 64-bit)
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF\Developer"; ValueType: string; ValueName: "8d912cc6-37a5-4b7a-8c41-6f661a999b36"; ValueData: "{app}\manifest.xml"; Flags: uninsdeletevalue
Root: HKLM; Subkey: "Software\Microsoft\Office\16.0\WEF\Developer"; ValueType: string; ValueName: "8d912cc6-37a5-4b7a-8c41-6f661a999b36"; ValueData: "{app}\manifest.xml"; Flags: uninsdeletevalue
Root: HKLM32; Subkey: "Software\Microsoft\Office\16.0\WEF\Developer"; ValueType: string; ValueName: "8d912cc6-37a5-4b7a-8c41-6f661a999b36"; ValueData: "{app}\manifest.xml"; Flags: uninsdeletevalue
Root: HKLM64; Subkey: "Software\Microsoft\Office\16.0\WEF\Developer"; ValueType: string; ValueName: "8d912cc6-37a5-4b7a-8c41-6f661a999b36"; ValueData: "{app}\manifest.xml"; Check: IsWin64; Flags: uninsdeletevalue

Root: HKCU; Subkey: "Software\Microsoft\Office\15.0\WEF\Developer"; ValueType: string; ValueName: "8d912cc6-37a5-4b7a-8c41-6f661a999b36"; ValueData: "{app}\manifest.xml"; Flags: uninsdeletevalue
Root: HKLM; Subkey: "Software\Microsoft\Office\15.0\WEF\Developer"; ValueType: string; ValueName: "8d912cc6-37a5-4b7a-8c41-6f661a999b36"; ValueData: "{app}\manifest.xml"; Flags: uninsdeletevalue
Root: HKLM32; Subkey: "Software\Microsoft\Office\15.0\WEF\Developer"; ValueType: string; ValueName: "8d912cc6-37a5-4b7a-8c41-6f661a999b36"; ValueData: "{app}\manifest.xml"; Flags: uninsdeletevalue
Root: HKLM64; Subkey: "Software\Microsoft\Office\15.0\WEF\Developer"; ValueType: string; ValueName: "8d912cc6-37a5-4b7a-8c41-6f661a999b36"; ValueData: "{app}\manifest.xml"; Check: IsWin64; Flags: uninsdeletevalue

; Bat buoc Word su dung Edge WebView2 Runtime hien dai thay vi IE11 cu ky (32-bit va 64-bit)
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF"; ValueType: dword; ValueName: "Win32WebView2"; ValueData: 1; Flags: uninsdeletevalue
Root: HKLM; Subkey: "Software\Microsoft\Office\16.0\WEF"; ValueType: dword; ValueName: "Win32WebView2"; ValueData: 1; Flags: uninsdeletevalue
Root: HKLM32; Subkey: "Software\Microsoft\Office\16.0\WEF"; ValueType: dword; ValueName: "Win32WebView2"; ValueData: 1; Flags: uninsdeletevalue
Root: HKLM64; Subkey: "Software\Microsoft\Office\16.0\WEF"; ValueType: dword; ValueName: "Win32WebView2"; ValueData: 1; Check: IsWin64; Flags: uninsdeletevalue

Root: HKCU; Subkey: "Software\Microsoft\Office\15.0\WEF"; ValueType: dword; ValueName: "Win32WebView2"; ValueData: 1; Flags: uninsdeletevalue
Root: HKLM; Subkey: "Software\Microsoft\Office\15.0\WEF"; ValueType: dword; ValueName: "Win32WebView2"; ValueData: 1; Flags: uninsdeletevalue
Root: HKLM32; Subkey: "Software\Microsoft\Office\15.0\WEF"; ValueType: dword; ValueName: "Win32WebView2"; ValueData: 1; Flags: uninsdeletevalue
Root: HKLM64; Subkey: "Software\Microsoft\Office\15.0\WEF"; ValueType: dword; ValueName: "Win32WebView2"; ValueData: 1; Check: IsWin64; Flags: uninsdeletevalue

; Khoi dong cung Windows
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "TVCIWordToolsHost"; ValueData: """{app}\{#MyAppExeName}"" --port 38473"; Flags: uninsdeletevalue; Tasks: startup
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "TVCIWordToolsHost"; ValueData: """{app}\{#MyAppExeName}"" --port 38473"; Flags: uninsdeletevalue; Tasks: startup

[Run]
; May chu da duoc tu dong bat trong CurStepChanged ben duoi

[UninstallRun]
; Dung tien trinh host truoc khi go bo
Filename: "{app}\{#MyAppExeName}"; Parameters: "--stop"; Flags: runhidden
; Xoa cache Office WEF
Filename: "cmd.exe"; Parameters: "/c rmdir /s /q ""%LOCALAPPDATA%\Microsoft\Office\16.0\Wef"""; Flags: runhidden

[Code]
function IsWebView2Installed(): Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
            RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) or
            RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version);
  if Result and ((Version = '') or (Version = '0.0.0.0')) then
    Result := False;
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Dung tien trinh cu neu dang chay de update muot ma
  Exec('taskkill.exe', '/f /im tvci-host.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // 0. Tu dong cai dat Microsoft Edge WebView2 Runtime neu may chua co
    if not IsWebView2Installed() then
    begin
      if FileExists(ExpandConstant('{app}\MicrosoftEdgeWebview2Setup.exe')) then
      begin
        Exec(ExpandConstant('{app}\MicrosoftEdgeWebview2Setup.exe'), '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      end;
    end;

    // 1. Cai dat chung chi Root CA vao he thong (LocalMachine Root)
    Exec('certutil.exe', '-addstore "Root" "' + ExpandConstant('{app}\ca.crt') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec(ExpandConstant('{app}\tvci-host.exe'), '--install-cert "' + ExpandConstant('{app}\ca.crt') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // 2. Cap Loopback Exemption cho Edge WebView2 va Office AppContainer
    Exec('CheckNetIsolation.exe', 'LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // 3. Xoa cache cu cua Office de bat buoc Word load lai tu host moi
    Exec('cmd.exe', '/c rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\16.0\Wef"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('cmd.exe', '/c rmdir /s /q "%LOCALAPPDATA%\Microsoft\Office\15.0\Wef"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // 4. Luon khoi dong may chu ngam ngay sau khi cai xong
    Exec(ExpandConstant('{app}\tvci-host.exe'), '--port 38473', '', SW_HIDE, ewNoWait, ResultCode);
  end;
end;

function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  // Dung tien trinh truoc khi go cai dat
  Exec('taskkill.exe', '/f /im tvci-host.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;
