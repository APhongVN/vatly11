[CmdletBinding()]
param(
    [string]$EnvFilePath = ".env.local"
)

$loadedValues = @{}
if (Test-Path -LiteralPath $EnvFilePath -PathType Leaf) {
    foreach ($line in Get-Content -LiteralPath $EnvFilePath) {
        if ($line -match '^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$') {
            $value = $Matches[2]
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $loadedValues[$Matches[1]] = $value
        }
    }
}

function Get-ConfigValue([string]$Name) {
    $processValue = [Environment]::GetEnvironmentVariable($Name, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($processValue)) { return $processValue.Trim() }
    if ($loadedValues.ContainsKey($Name)) { return ([string]$loadedValues[$Name]).Trim() }
    return ''
}

$supabaseUrl = Get-ConfigValue 'NEXT_PUBLIC_SUPABASE_URL'
$publicKey = Get-ConfigValue 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
if (-not $publicKey) { $publicKey = Get-ConfigValue 'NEXT_PUBLIC_SUPABASE_ANON_KEY' }
$serverKey = Get-ConfigValue 'SUPABASE_SECRET_KEY'
if (-not $serverKey) { $serverKey = Get-ConfigValue 'SUPABASE_SERVICE_ROLE_KEY' }
$issues = [System.Collections.Generic.List[string]]::new()
$urlIsValid = $false
$parsedUrl = $null
if ($supabaseUrl) {
    try {
        $parsedUrl = [uri]::new($supabaseUrl)
        $urlIsValid = $parsedUrl.IsAbsoluteUri -and $parsedUrl.Host -and ($parsedUrl.Scheme -eq 'https' -or $parsedUrl.IsLoopback)
    } catch { $urlIsValid = $false }
}
if (-not $urlIsValid) { $issues.Add('NEXT_PUBLIC_SUPABASE_URL thiếu hoặc không phải URL Supabase hợp lệ.') }

$publicKeyKind = 'missing'
$publicRoleIsAnon = 'not checked'
$publicRoleIsService = $false
$publicKeyExpired = $false
if ($publicKey.StartsWith('sb_publishable_')) {
    $publicKeyKind = 'publishable key'
} elseif ($publicKey.StartsWith('sb_secret_')) {
    $publicKeyKind = 'secret key in public variable'
    $publicRoleIsService = $true
    $issues.Add('Không đặt sb_secret key ở biến NEXT_PUBLIC_*; hãy thu hồi nếu khóa này từng bị phát hành.')
} elseif ($publicKey) {
    $parts = $publicKey.Split('.')
    if ($parts.Length -eq 3) {
        $publicKeyKind = 'legacy JWT'
        try {
            $payloadSegment = $parts[1].Replace('-', '+').Replace('_', '/')
            switch ($payloadSegment.Length % 4) {
                2 { $payloadSegment += '==' }
                3 { $payloadSegment += '=' }
                1 { throw 'Invalid base64url payload' }
            }
            $payloadJson = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payloadSegment))
            $payload = $payloadJson | ConvertFrom-Json
            $publicRoleIsAnon = ([string]$payload.role -eq 'anon')
            $publicRoleIsService = ([string]$payload.role -eq 'service_role')
            if ($publicRoleIsService) { $issues.Add('Khóa trong biến NEXT_PUBLIC_* có quyền service_role; phải thu hồi và dùng anon/publishable key.') }
            elseif (-not $publicRoleIsAnon) { $issues.Add('JWT công khai không có vai trò anon; dùng khóa anon hoặc publishable mới.') }
            if ($payload.exp) {
                $publicKeyExpired = ([DateTimeOffset]::FromUnixTimeSeconds([long]$payload.exp) -lt [DateTimeOffset]::UtcNow)
                if ($publicKeyExpired) { $issues.Add('JWT công khai đã hết hạn; hãy tạo/rotate khóa trong Supabase.') }
            }
        } catch {
            $publicKeyKind = 'invalid legacy JWT'
            $publicRoleIsAnon = $false
            $issues.Add('Không đọc được metadata an toàn của JWT; hãy sao chép lại khóa từ Supabase.')
        }
    } else {
        $publicKeyKind = 'unknown key format'
        $issues.Add('Định dạng khóa công khai không nhận diện được.')
    }
} else {
    $issues.Add('Thiếu NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

$probeResult = 'not run'
if ($urlIsValid -and $publicKey) {
    try {
        $probeUri = $parsedUrl.AbsoluteUri.TrimEnd('/') + '/rest/v1/courses?select=id&limit=0'
        $probe = Invoke-WebRequest -Uri $probeUri -Method Get -Headers @{ apikey = $publicKey; Accept = 'application/json' } -SkipHttpErrorCheck -TimeoutSec 10
        if ($probe.StatusCode -eq 200) {
            $probeResult = 'key accepted; public read allowed'
        } elseif ($probe.Content -match '(?i)invalid api key') {
            $probeResult = "key rejected by configured project (HTTP $($probe.StatusCode))"
            $issues.Add('Supabase từ chối khóa tại URL đang cấu hình. Hãy lấy URL và publishable/anon key từ cùng project; không thể suy ra project từ claim iss của legacy JWT.')
        } else {
            $probeResult = "HTTP $($probe.StatusCode); check RLS, grants and migrations"
            $issues.Add("Yêu cầu đọc metadata trả HTTP $($probe.StatusCode); kiểm tra RLS/grants/migrations trong Supabase.")
        }
    } catch {
        $probeResult = 'network check failed'
        $issues.Add('Không kết nối được endpoint Supabase để kiểm tra khóa; kiểm tra DNS/mạng và URL.')
    }
}
if (-not $serverKey) { $issues.Add('Thiếu SUPABASE_SECRET_KEY phía server; các thao tác quản trị và giới hạn API cần khóa này.') }

Write-Output 'Supabase config check (không hiển thị giá trị URL/khóa):'
Write-Output "- URL project hợp lệ: $($urlIsValid.ToString().ToLowerInvariant())"
Write-Output "- Loại khóa công khai: $publicKeyKind"
Write-Output "- Vai trò anon của JWT: $publicRoleIsAnon"
Write-Output "- JWT đã hết hạn: $($publicKeyExpired.ToString().ToLowerInvariant())"
Write-Output "- Kiểm tra đọc API: $probeResult"
Write-Output "- Khóa service_role bị đặt công khai: $($publicRoleIsService.ToString().ToLowerInvariant())"
Write-Output "- Khóa server đã cấu hình: $([bool]$serverKey)"
if ($issues.Count -gt 0) {
    Write-Output 'Cần xử lý:'
    foreach ($issue in $issues) { Write-Output "- $issue" }
    exit 2
}
Write-Output 'Cấu hình Supabase đã qua kiểm tra đọc công khai.'
