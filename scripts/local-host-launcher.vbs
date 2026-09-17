Option Explicit

Dim shell, fileSystem, projectPath, npmPath, commandLine, stopFilePath, exitCode

If WScript.Arguments.Count < 2 Then
  WScript.Quit 2
End If

projectPath = WScript.Arguments(0)
npmPath = WScript.Arguments(1)

Set fileSystem = CreateObject("Scripting.FileSystemObject")
If Not fileSystem.FolderExists(projectPath) Or Not fileSystem.FileExists(npmPath) Then
  WScript.Quit 3
End If

stopFilePath = fileSystem.BuildPath(projectPath, ".tvci-host-stop")

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = projectPath

' The outer quotes are required by cmd.exe when npm.cmd is installed below a path with spaces.
commandLine = "cmd.exe /d /c " & Chr(34) & Chr(34) & npmPath & Chr(34) & " run dev-server" & Chr(34)

' Keep the local host alive after an unexpected server exit. Uninstall creates
' the marker first, so the watchdog can stop without starting a new server.
Do
  If fileSystem.FileExists(stopFilePath) Then
    WScript.Quit 0
  End If

  exitCode = shell.Run(commandLine, 0, True)
  If fileSystem.FileExists(stopFilePath) Then
    WScript.Quit 0
  End If

  WScript.Sleep 2000
Loop
