$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

function Test-PortOpen {
  param(
    [int]$Port
  )

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $asyncResult = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if (-not $asyncResult.AsyncWaitHandle.WaitOne(300)) {
      return $false
    }

    $client.EndConnect($asyncResult)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

$port = 3173
if (Test-PortOpen -Port $port) {
  Start-Process "http://localhost:$port/"
  return
}

$nodePath = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $PSScriptRoot ".temp"
if (-not (Test-Path -LiteralPath $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$stdout = Join-Path $logDir "server.out.log"
$stderr = Join-Path $logDir "server.err.log"

Start-Process -FilePath $nodePath -ArgumentList "server.js" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null
Start-Sleep -Seconds 2

if (-not (Test-PortOpen -Port $port)) {
  throw "Local server failed to start. Check $stderr for details."
}

Start-Process "http://localhost:$port/"
