#define MyAppName "TVCI Word Tools"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "TVCI"

[Setup]
AppId={{8D912CC6-37A5-4B7A-8C41-6F661A999B36}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\TVCIWordTools
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\release
OutputBaseFilename=TVCI-Word-Tools-Setup-{#MyAppVersion}-x64
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\app\assets\logo-tvci.png

[Files]
Source: "..\release\staging\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\release\staging\manifest\*"; DestDir: "{app}\manifest"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\release\staging\server\*"; DestDir: "{app}\server"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\release\staging\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\release\staging\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\release\staging\repair.cmd"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\{#MyAppName} Repair"; Filename: "{app}\repair.cmd"
Name: "{userprograms}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\setup.ps1"""; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\uninstall.ps1"""; Flags: runhidden waituntilterminated
