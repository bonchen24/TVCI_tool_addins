Option Explicit
Dim shell, fileSystem, hostExe, hostScript, stopMarker, commandLine

If WScript.Arguments.Count < 2 Then
  WScript.Quit 2
End If

hostExe = WScript.Arguments(0)
hostScript = WScript.Arguments(1)

Set fileSystem = CreateObject("Scripting.FileSystemObject")
stopMarker = fileSystem.BuildPath(fileSystem.GetParentFolderName(hostScript), "..\.tvci-stop")
Set shell = CreateObject("WScript.Shell")
commandLine = """" & hostExe & """ """ & hostScript & """"

Do
  If fileSystem.FileExists(stopMarker) Then
    WScript.Quit 0
  End If
  shell.Run commandLine, 0, True
  If fileSystem.FileExists(stopMarker) Then
    WScript.Quit 0
  End If
  WScript.Sleep 2000
Loop
