param(
    [string]$Message = "Update site content"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Staging changes..."
git add -A

$hasChanges = git status --porcelain
if (-not $hasChanges) {
    Write-Host "Nothing to commit. Working tree is clean."
    exit 0
}

Write-Host "Committing..."
git commit -m $Message

Write-Host "Pulling latest changes from origin/main..."
git pull --rebase origin main

Write-Host "Pushing to origin/main..."
git push

Write-Host "Done."
