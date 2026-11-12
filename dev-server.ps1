$port = 8088
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host " FixMyDesk Local Web Server Aktif!        " -ForegroundColor Green
    Write-Host " Buka browser di: $prefix " -ForegroundColor Yellow
    Write-Host " Tekan Ctrl + C di terminal untuk stop    " -ForegroundColor Gray
    Write-Host "==========================================" -ForegroundColor Cyan

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $rawPath = $req.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($rawPath)) { $rawPath = 'index.html' }
        $filePath = Join-Path $PSScriptRoot $rawPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            if ($rawPath.EndsWith('.html')) { $res.ContentType = 'text/html; charset=utf-8' }
            elseif ($rawPath.EndsWith('.js')) { $res.ContentType = 'application/javascript; charset=utf-8' }
            elseif ($rawPath.EndsWith('.css')) { $res.ContentType = 'text/css; charset=utf-8' }
            elseif ($rawPath.EndsWith('.png')) { $res.ContentType = 'image/png' }
            elseif ($rawPath.EndsWith('.jpg') -or $rawPath.EndsWith('.jpeg')) { $res.ContentType = 'image/jpeg' }
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
