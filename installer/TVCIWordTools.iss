#ifndef MyAppVersion
  #error MyAppVersion must be passed by package-installer.mjs
#endif
#define MyAppName "TVCI Word Tools"
#define Publisher "Trung tâm Thử nghiệm - Kiểm định Công nghiệp"

[Setup]
AppId={{8D912CC6-37A5-4B7A-8C41-6F661A999B36}
AppName={#MyAppName}
AppVerName={#MyAppName} {#MyAppVersion}
AppVersion={#MyAppVersion}
AppPublisher={#Publisher}
AppComments=Bộ công cụ hỗ trợ soạn thảo và biểu mẫu trên Microsoft Word
AppCopyright=Copyright (C) 2026 {#Publisher}
VersionInfoVersion={#MyAppVersion}.0
VersionInfoTextVersion={#MyAppVersion}
VersionInfoCompany={#Publisher}
VersionInfoDescription=TVCI Word Tools installer
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
DefaultDirName={localappdata}\TVCIWordTools
DefaultGroupName={#MyAppName}
PrivilegesRequired=lowest
CloseApplications=no
OutputDir=..\release
OutputBaseFilename=TVCI-Word-Tools-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
WizardSmallImageFile=..\assets\icon-80.png
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
UninstallDisplayIcon={app}\app\assets\logo-tvci.png
ShowLanguageDialog=no

[Messages]
SetupWindowTitle=Cài đặt - %1
InformationTitle=Thông tin
ErrorTitle=Lỗi
ButtonBack=< &Trước
ButtonNext=&Tiếp >
ButtonInstall=&Cài đặt
ButtonCancel=Hủy
ButtonFinish=&Hoàn tất
ClickNext=Nhấn Tiếp để tiếp tục hoặc Hủy để thoát.
WelcomeLabel1=Chào mừng đến với TVCI Word Tools
WelcomeLabel2=Thông tin và yêu cầu trước khi cài đặt.
WizardSelectDir=Chọn vị trí cài đặt
SelectDirDesc=Chọn vị trí cài TVCI Word Tools.
SelectDirLabel3=Bộ cài sẽ cài TVCI Word Tools vào thư mục sau:
SelectDirBrowseLabel=Nhấn Tiếp để tiếp tục hoặc Duyệt để chọn thư mục khác.
WizardSelectProgramGroup=Thư mục Start Menu
SelectStartMenuFolderDesc=Chọn vị trí tạo lối tắt chương trình.
SelectStartMenuFolderLabel3=Lối tắt sẽ được tạo trong thư mục Start Menu sau:
WizardReady=Sẵn sàng cài đặt
ReadyLabel1=TVCI Word Tools đã sẵn sàng để cài đặt.
ReadyLabel2a=Nhấn Cài đặt để tiếp tục hoặc Trước để xem lại lựa chọn.
ReadyLabel2b=Nhấn Cài đặt để bắt đầu.
WizardPreparing=Chuẩn bị cài đặt
PreparingDesc=Bộ cài đang chuẩn bị cài TVCI Word Tools.
WizardInstalling=Đang cài đặt
InstallingLabel=Vui lòng chờ trong khi bộ cài sao chép và cấu hình TVCI Word Tools.
FinishedHeadingLabel=Hoàn tất cài đặt TVCI Word Tools
FinishedLabel=Đang hoàn tất cài đặt.

[Files]
Source: "..\release\staging\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\release\staging\manifest\manifest.xml"; DestDir: "{app}\manifest"; Flags: ignoreversion
Source: "..\release\staging\server\server.js"; DestDir: "{app}\server"; Flags: ignoreversion
Source: "..\release\staging\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs
Source: "..\release\staging\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs
Source: "..\installer\common.ps1"; Flags: dontcopy
Source: "..\installer\stop-host.ps1"; Flags: dontcopy
Source: "..\installer\preflight.ps1"; Flags: dontcopy
Source: "..\release\staging\repair.cmd"; DestDir: "{app}"; Flags: ignoreversion

[InstallDelete]
Type: filesandordirs; Name: "{app}\app"

[Icons]
Name: "{userprograms}\{#MyAppName}\Repair"; Filename: "{app}\repair-installer.exe"
Name: "{userprograms}\{#MyAppName}\Sửa lỗi & Kích hoạt WebView2"; Filename: "{app}\repair.cmd"
Name: "{userprograms}\{#MyAppName}\Check Status"; Filename: "powershell.exe"; Parameters: "-NoProfile -NoExit -ExecutionPolicy Bypass -File ""{app}\scripts\verify.ps1"""
Name: "{userprograms}\{#MyAppName}\Open Logs"; Filename: "explorer.exe"; Parameters: """{app}\logs"""
Name: "{userprograms}\{#MyAppName}\Uninstall"; Filename: "{uninstallexe}"

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\uninstall.ps1"""; Flags: runhidden waituntilterminated; RunOnceId: "TVCIUserCleanup"

[UninstallDelete]
Type: files; Name: "{app}\repair-installer.exe"

[Code]
var
  PreflightPage: TWizardPage;
  PreflightMemo: TNewMemo;
  PreflightExitCode: Integer;
  PreflightOutput: String;
  InstallFailed: Boolean;
  InstallFailure: String;
  InstallVersion: String;
  StopHostExitCode: Integer;
  StopHostDiagnostic: AnsiString;

procedure InitializeWizard;
begin
  InstallVersion := '{#MyAppVersion}';
  WizardForm.WelcomeLabel1.Caption := 'TVCI Word Tools  ' + InstallVersion;
  WizardForm.WelcomeLabel2.Caption :=
    'Đơn vị phát hành: {#Publisher}' + #13#10 + #13#10 +
    'Bộ công cụ hỗ trợ soạn thảo/biểu mẫu trên Microsoft Word.' + #13#10 + #13#10 +
    'Yêu cầu: Windows x64 và Microsoft Word desktop. Bộ cài hoạt động trong tài khoản hiện tại và không yêu cầu quyền quản trị.';

  PreflightPage := CreateCustomPage(wpSelectDir, 'Kiểm tra trước khi cài đặt', 'Các điều kiện trên máy tính của bạn');
  PreflightMemo := TNewMemo.Create(WizardForm);
  PreflightMemo.Parent := PreflightPage.Surface;
  PreflightMemo.Left := ScaleX(0);
  PreflightMemo.Top := ScaleY(0);
  PreflightMemo.Width := PreflightPage.SurfaceWidth;
  PreflightMemo.Height := PreflightPage.SurfaceHeight;
  PreflightMemo.ReadOnly := True;
  PreflightMemo.ScrollBars := ssVertical;
  PreflightMemo.WordWrap := True;
  PreflightMemo.Text := 'Đang chuẩn bị kiểm tra điều kiện...';

end;

function InitializeSetup: Boolean;
begin
  Result := IsWin64;
  if not Result then
    MsgBox('Bộ cài yêu cầu Windows x64. Máy tính này đang dùng Windows x86 nên không thể tiếp tục.', mbCriticalError, MB_OK);
end;

procedure RunPreflight;
var
  PowerShell: String;
  Script: String;
  Lines: TStringList;
  I: Integer;
  Sep: Integer;
  Key: String;
  Value: String;
  Status: String;
  Detail: String;
begin
  ExtractTemporaryFile('preflight.ps1');
  Script := ExpandConstant('{tmp}\preflight.ps1');
  PreflightOutput := ExpandConstant('{tmp}\tvci-preflight.txt');
  DeleteFile(PreflightOutput);
  PowerShell := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
  if not Exec(PowerShell,
    '-NoProfile -ExecutionPolicy Bypass -File "' + Script + '" -InstallDir "' + WizardDirValue() + '" -OutputFile "' + PreflightOutput + '"',
    '', SW_HIDE, ewWaitUntilTerminated, PreflightExitCode) then
    PreflightExitCode := 1;

  PreflightMemo.Lines.Clear;
  PreflightMemo.Lines.Add('KẾT QUẢ KIỂM TRA ĐIỀU KIỆN');
  PreflightMemo.Lines.Add('');
  Lines := TStringList.Create;
  if FileExists(PreflightOutput) then
  begin
    Lines.LoadFromFile(PreflightOutput);
    for I := 0 to Lines.Count - 1 do
    begin
      Sep := Pos('|', Lines[I]);
      if Sep > 0 then
      begin
        Key := Copy(Lines[I], 1, Sep - 1);
        Value := Copy(Lines[I], Sep + 1, Length(Lines[I]));
        Status := Value;
        Detail := '';
        Sep := Pos(':', Value);
        if Sep > 0 then
        begin
          Status := Copy(Value, 1, Sep - 1);
          Detail := ' (' + Copy(Value, Sep + 1, Length(Value)) + ')';
        end;
        if Key = 'WindowsX64' then Key := 'Windows x64'
        else if Key = 'WordOffice' then Key := 'Microsoft Word/Office desktop được phát hiện'
        else if Key = 'OfficeArch' then Key := 'Kiến trúc Office x86/x64'
        else if Key = 'WebView2' then Key := 'WebView2'
        else if Key = 'Port38473' then Key := 'Cổng localhost 38473 sẵn sàng'
        else if Key = 'InstallFolder' then Key := 'Có thể ghi vào thư mục cài đặt';

        if Status = 'PASS' then
          PreflightMemo.Lines.Add('[PASS] ' + Key + Detail)
        else if Status = 'WARN' then
          PreflightMemo.Lines.Add('[CẦN CÀI] ' + Key + ' chưa có. Bộ cài sẽ cài WebView2 từ gói offline đi kèm.')
        else if Key = 'Microsoft Word/Office desktop được phát hiện' then
          PreflightMemo.Lines.Add('[FAIL] Không tìm thấy Microsoft Word desktop. Hãy cài Word rồi kiểm tra lại.')
        else if Key = 'Kiến trúc Office x86/x64' then
          PreflightMemo.Lines.Add('[FAIL] Không xác định được phiên bản Office x86/x64. Hãy mở Word một lần rồi kiểm tra lại.')
        else if Key = 'Cổng localhost 38473 sẵn sàng' then
          PreflightMemo.Lines.Add('[FAIL] Cổng 38473 đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi kiểm tra lại.')
        else if Key = 'Có thể ghi vào thư mục cài đặt' then
          PreflightMemo.Lines.Add('[FAIL] Không thể ghi vào thư mục cài đặt. Hãy chọn thư mục khác hoặc kiểm tra quyền tài khoản hiện tại.')
        else
          PreflightMemo.Lines.Add('[FAIL] ' + Key + Detail);
      end;
    end;
  end
  else
  begin
    PreflightExitCode := 1;
    PreflightMemo.Lines.Add('[FAIL] Không đọc được kết quả kiểm tra. Hãy chạy lại bộ cài.');
  end;
  Lines.Free;
  PreflightMemo.Lines.Add('');
  if PreflightExitCode = 0 then
    PreflightMemo.Lines.Add('Các điều kiện bắt buộc đã đạt. Nhấn Tiếp để tiếp tục.')
  else
    PreflightMemo.Lines.Add('Có điều kiện bắt buộc chưa đạt. Hãy xử lý các dòng FAIL rồi nhấn Kiểm tra lại.');
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = PreflightPage.ID then
    RunPreflight;
  if CurPageID = wpFinished then
  begin
    if InstallFailed then
    begin
      WizardForm.FinishedHeadingLabel.Caption := 'Chưa thể hoàn tất cài đặt';
      WizardForm.FinishedLabel.Caption :=
        'TVCI Word Tools chưa sẵn sàng.' + #13#10 + #13#10 +
        'Nguyên nhân kỹ thuật: ' + InstallFailure + #13#10 + #13#10 +
        'Nhật ký: ' + ExpandConstant('{app}\logs\setup.log') + #13#10 +
        'Mở Start Menu > TVCI Word Tools > Repair để thử sửa lại. Bộ cài WebView2 offline được sử dụng khi runtime còn thiếu. Nếu cổng 38473 đang bận, đóng ứng dụng đang dùng cổng đó. Kiểm tra Word desktop đã được cài và chạy lại Repair.';
    end
    else
    begin
      WizardForm.FinishedHeadingLabel.Caption := 'Cài đặt thành công';
      WizardForm.FinishedLabel.Caption :=
        'TVCI Word Tools phiên bản ' + InstallVersion + ' đã được cài đặt và kiểm tra.' + #13#10 + #13#10 +
        'Để tải add-in, hãy đóng toàn bộ Microsoft Word (mọi cửa sổ Word) rồi mở Word lại. Vào tab TVCI để kiểm tra các công cụ.' + #13#10 + #13#10 +
        'Trong Start Menu > TVCI Word Tools, bạn có thể chọn Repair, Check Status, Open Logs hoặc Uninstall.';
    end;
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = PreflightPage.ID then
  begin
    if PreflightExitCode <> 0 then
    begin
      MsgBox('Một số điều kiện bắt buộc chưa đạt. Hãy quay lại trang này để kiểm tra lại sau khi xử lý, hoặc chọn Hủy để thoát bộ cài.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  StopHostScript: String;
  StopHostDiagnosticFile: String;
  PowerShell: String;
  Parameters: String;
begin
  Result := '';
  NeedsRestart := False;
  ExtractTemporaryFile('common.ps1');
  ExtractTemporaryFile('stop-host.ps1');
  StopHostScript := ExpandConstant('{tmp}\stop-host.ps1');
  StopHostDiagnosticFile := ExpandConstant('{tmp}\tvci-stop-host-diagnostic.txt');
  DeleteFile(StopHostDiagnosticFile);
  PowerShell := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
  Parameters := '-NoProfile -ExecutionPolicy Bypass -File "' + StopHostScript + '" -InstallDir "' + ExpandConstant('{app}') + '" -DiagnosticFile "' + StopHostDiagnosticFile + '"';
  if not Exec(PowerShell, Parameters, '', SW_HIDE, ewWaitUntilTerminated, StopHostExitCode) then
    StopHostExitCode := -1;
  if StopHostExitCode <> 0 then
  begin
    Result := 'Không thể dừng TVCI local host hoặc nhả cổng 38473. Bộ cài đã dừng trước khi ghi đè file.';
    if LoadStringFromFile(StopHostDiagnosticFile, StopHostDiagnostic) then
      Result := Result + #13#10#13#10 + 'Chi tiết: ' + Trim(String(StopHostDiagnostic))
    else
      Result := Result + ' Hãy xem chẩn đoán tại ' + StopHostDiagnosticFile + ' hoặc đóng ứng dụng đang sử dụng cổng 38473.';
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Code: Integer;
  Script: String;
  SourceExe: String;
  RepairExe: String;
  SourceSize: Int64;
  RepairSize: Int64;
  CacheOk: Boolean;
  FailureAnsi: AnsiString;
begin
  if CurStep = ssInstall then
    WizardForm.StatusLabel.Caption := 'Đang sao chép thành phần TVCI Word Tools...';

  if CurStep = ssPostInstall then
  begin
    SourceExe := ExpandConstant('{srcexe}');
    RepairExe := ExpandConstant('{app}\repair-installer.exe');
    CacheOk := CompareText(SourceExe, RepairExe) = 0;
    if not CacheOk then
    begin
      CacheOk := FileSize64(SourceExe, SourceSize);
      if CacheOk then
        CacheOk := CopyFile(SourceExe, RepairExe, False);
      if CacheOk then
      begin
        CacheOk := FileExists(RepairExe);
        if CacheOk then
        begin
          CacheOk := FileSize64(RepairExe, RepairSize);
          if CacheOk then
            CacheOk := RepairSize = SourceSize;
        end;
      end;
    end;
    WizardForm.StatusLabel.Caption := 'Đang kiểm tra WebView2, cấu hình HTTPS localhost/certificate, đăng ký Word add-in và khởi động TVCI local host...';
    WizardForm.Update;
    Script := ExpandConstant('{app}\scripts\setup.ps1');
    if (not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), '-NoProfile -ExecutionPolicy Bypass -File "' + Script + '"', '', SW_HIDE, ewWaitUntilTerminated, Code)) then
      Code := -1;
    if Code <> 0 then
    begin
      InstallFailed := True;
      InstallFailure := 'Setup process exited with code ' + IntToStr(Code);
      if LoadStringFromFile(ExpandConstant('{app}\logs\setup-failure.txt'), FailureAnsi) then
        InstallFailure := Trim(String(FailureAnsi));
    end
    else if not CacheOk then
    begin
      InstallFailed := True;
      InstallFailure := 'Không lưu được bộ cài để Repair có thể sử dụng.';
    end;
  end;
end;
