# Push only modified tracked files to git cd "C:\Users\LokI\OneDrive - The Hang Seng University of Hong Kong\桌面\GEMINI\v2"
#Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
#.\push_changes.ps1
$status = git status --porcelain | Where-Object { $_ -match '^\s*M' -or $_ -match '^M' }

if (-not $status) {
    $ahead = git rev-list origin/main..HEAD --count 2>$null
    if ($ahead -gt 0) {
        Write-Host "No new changes to commit, but $ahead unpushed commit(s) found. Pushing..." -ForegroundColor Yellow
        git push origin main
    } else {
        Write-Host "No modified tracked files to push." -ForegroundColor Yellow
    }
    exit 0
}

Write-Host "Modified files to be committed:" -ForegroundColor Cyan
git status --short | Where-Object { $_ -notmatch '^\?' }

$msg = Read-Host "`nCommit message (leave blank for timestamp)"
if ([string]::IsNullOrWhiteSpace($msg)) {
    $msg = "update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git add -u
git commit -m $msg
git push origin main
