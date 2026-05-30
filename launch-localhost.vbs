Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1Path = scriptDir & "\launch-localhost.ps1"

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1Path & """"
shell.Run command, 0, False
