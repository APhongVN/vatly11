param(
  [string]$Ref = 'HEAD'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot
try {
  $resolvedRef = (& git rev-parse --verify "$Ref^{commit}" 2>$null)
  if ($LASTEXITCODE -ne 0 -or -not $resolvedRef) { throw "Git ref does not resolve to a commit: $Ref" }
  $dirtyFiles = @(& git status --porcelain)
  if ($LASTEXITCODE -ne 0) { throw 'Could not read Git working tree status.' }
  if ($dirtyFiles.Count -gt 0) { throw 'Commit or discard working tree changes before running the release-history scan.' }

  $credentialPattern = '(eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{30,}|AQ\.[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{20,})'
  if ((('AQ.' + ('A' * 36)) -notmatch $credentialPattern) -or (('AIza' + ('B' * 36)) -notmatch $credentialPattern)) { throw 'Credential scanner self-test failed.' }
  $commits = @(& git rev-list $resolvedRef)
  if ($LASTEXITCODE -ne 0 -or $commits.Count -eq 0) { throw "Could not read commit history for $Ref." }
  $findings = [System.Collections.Generic.List[string]]::new()

  foreach ($commit in $commits) {
    $matches = @(& git grep -I -l -E $credentialPattern $commit -- . 2>$null)
    $grepExitCode = $LASTEXITCODE
    if ($grepExitCode -eq 0) {
      foreach ($matchPath in $matches) { $findings.Add("credential pattern in $matchPath") }
    } elseif ($grepExitCode -ne 1) {
      throw "Git could not scan commit $commit."
    }

    $trackedPaths = @(& git ls-tree -r --name-only $commit)
    if ($LASTEXITCODE -ne 0) { throw "Git could not list files for commit $commit." }
    foreach ($trackedPath in $trackedPaths) {
      if ($trackedPath -match '(^|/)\.env(?:$|\.)' -and $trackedPath -ne '.env.example') {
        $findings.Add("environment file in commit $commit : $trackedPath")
      }
    }
  }

  if ($findings.Count -gt 0) {
    Write-Output "Release history scan blocked for $resolvedRef. Findings (values are never printed):"
    $findings | Select-Object -Unique | ForEach-Object { Write-Output "- $_" }
    exit 1
  }
  Write-Output "Release history scan passed for $resolvedRef ($($commits.Count) commits); no configured credential patterns or tracked environment files found."
} finally {
  Pop-Location
}
