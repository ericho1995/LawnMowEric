param(
  [int]$Port = 8791,
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

# Plain TcpListener instead of HttpListener: HttpListener refuses to bind
# any non-localhost prefix without a URL ACL reservation (admin-only), but
# a raw socket on 0.0.0.0 needs no special privilege - so phones on the
# same Wi-Fi can reach this during dev preview, not just this machine.

$mime = @{
  ".html" = "text/html; charset=utf-8"; ".htm" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".svg" = "image/svg+xml"
  ".ico" = "image/x-icon"; ".md" = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
$listener.Start()

$lanIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -ExpandProperty IPAddress

Write-Host "Serving $Root - open one of these:"
Write-Host "  http://localhost:$Port/  (this machine only)"
foreach ($ip in $lanIps) { Write-Host "  http://${ip}:${Port}/  (same Wi-Fi/network - try this on a phone)" }

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $requestLine = $reader.ReadLine()
    while (($line = $reader.ReadLine()) -and $line -ne "") { }

    $path = "/"
    if ($requestLine -match '^\S+\s+(\S+)\s+HTTP') { $path = $matches[1] }
    $path = ($path -split '\?')[0]
    $path = [System.Uri]::UnescapeDataString($path)
    if ($path -eq "/") { $path = "/index.html" }
    $filePath = Join-Path $Root ($path.TrimStart("/"))

    $writer = New-Object System.IO.StreamWriter($stream)
    $writer.NewLine = "`r`n"
    $writer.AutoFlush = $false

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath)
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $writer.WriteLine("HTTP/1.1 200 OK")
      $writer.WriteLine("Content-Type: $contentType")
      $writer.WriteLine("Content-Length: $($bytes.Length)")
      $writer.WriteLine("Connection: close")
      $writer.WriteLine("")
      $writer.Flush()
      $stream.Write($bytes, 0, $bytes.Length)
    } else {
      $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $path")
      $writer.WriteLine("HTTP/1.1 404 Not Found")
      $writer.WriteLine("Content-Type: text/plain; charset=utf-8")
      $writer.WriteLine("Content-Length: $($msg.Length)")
      $writer.WriteLine("Connection: close")
      $writer.WriteLine("")
      $writer.Flush()
      $stream.Write($msg, 0, $msg.Length)
    }
    $stream.Flush()
  } catch {
  } finally {
    $client.Close()
  }
}
