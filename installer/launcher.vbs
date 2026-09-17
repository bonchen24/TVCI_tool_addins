Set objShell = CreateObject("WScript.Shell")
strCommand = """" & WScript.Arguments(0) & """ """ & WScript.Arguments(1) & """"
objShell.Run strCommand, 0, False
