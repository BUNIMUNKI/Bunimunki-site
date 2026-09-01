param(
  [switch]$VerboseOutput
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function To-ForwardSlashes {
  param([string]$Path)
  return $Path -replace "\\", "/"
}

function Get-RelativePathForward {
  param(
    [string]$RootPath,
    [string]$FullPath
  )

  $root = (Resolve-Path $RootPath).Path.TrimEnd('\\')
  $full = (Resolve-Path $FullPath).Path

  if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    $relative = $full.Substring($root.Length).TrimStart('\\')
    return To-ForwardSlashes($relative)
  }

  return To-ForwardSlashes($full)
}

function To-DisplayTitle {
  param([string]$BaseName)

  $clean = $BaseName -replace "[_-]+", " "
  $clean = $clean -replace "\s+", " "
  $clean = $clean.Trim()

  if ([string]::IsNullOrWhiteSpace($clean)) {
    return "Untitled"
  }

  $textInfo = (Get-Culture).TextInfo
  return $textInfo.ToTitleCase($clean.ToLower())
}

function Infer-Medium {
  param([string]$FileName)

  $lower = $FileName.ToLowerInvariant()
  if ($lower -match "sketch|lineart|wip|screenshot") {
    return "Sketch"
  }
  if ($lower -match "anim|animation|gif") {
    return "Animation"
  }
  return "Full Color"
}

function New-ArtId {
  param([int]$Number)
  return ("art-{0:d3}" -f $Number)
}

$repoRoot = Get-RepoRoot
$dataPath = Join-Path $repoRoot "data/site-data.json"
$artRoot = Join-Path $repoRoot "assets/art"

if (-not (Test-Path $dataPath)) {
  throw "Could not find data file at $dataPath"
}
if (-not (Test-Path $artRoot)) {
  throw "Could not find art directory at $artRoot"
}

$categoryMap = @{
  "environment" = "Environment"
  "enviornment" = "Environment"
  "vehicles" = "Vehicles"
  "other" = "Other"
  "lydia" = "Lydia"
  "sedna" = "Sedna"
  "gg" = "Glepglorp (GG)"
  "glepglorp" = "Glepglorp (GG)"
  "bebe" = "Bebe"
  "fek" = "Fek"
}

$allowedTopFolders = @($categoryMap.Keys)
$imageExtensions = @(".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif")

$data = Get-Content $dataPath -Raw | ConvertFrom-Json
if ($null -eq $data.artworks) {
  $data | Add-Member -MemberType NoteProperty -Name artworks -Value @()
}

$existingByImage = @{}
$maxExistingId = 0

foreach ($art in @($data.artworks)) {
  if ($null -eq $art) {
    continue
  }

  $imageKey = To-ForwardSlashes([string]$art.image).ToLowerInvariant()
  if (-not [string]::IsNullOrWhiteSpace($imageKey)) {
    $existingByImage[$imageKey] = $art
  }

  $idText = [string]$art.id
  if ($idText -match "^art-(\d+)$") {
    $n = [int]$Matches[1]
    if ($n -gt $maxExistingId) {
      $maxExistingId = $n
    }
  }
}

$files = Get-ChildItem -Path $artRoot -File -Recurse |
  Where-Object { $imageExtensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object FullName

$newArtworks = New-Object System.Collections.Generic.List[object]
$nextId = $maxExistingId + 1

foreach ($file in $files) {
  $relativeFromArt = Get-RelativePathForward -RootPath $artRoot -FullPath $file.FullName
  $parts = $relativeFromArt.Split("/")
  if ($parts.Count -lt 2) {
    continue
  }

  $topFolder = $parts[0].ToLowerInvariant()
  if ($allowedTopFolders -notcontains $topFolder) {
    continue
  }

  $imageRelative = To-ForwardSlashes((Join-Path "assets/art" $relativeFromArt))
  $imageKey = $imageRelative.ToLowerInvariant()

  if ($existingByImage.ContainsKey($imageKey)) {
    $existing = $existingByImage[$imageKey]
    $existingMedium = [string]$existing.medium
    $inferredMedium = Infer-Medium -FileName $file.Name

    # Preserve manual metadata, but upgrade stale Full Color entries when filename clearly indicates another medium.
    $resolvedMedium = $existingMedium
    if ($existingMedium -eq "Full Color" -and $inferredMedium -ne "Full Color") {
      $resolvedMedium = $inferredMedium
    }

    $newArtworks.Add([pscustomobject]@{
      id = [string]$existing.id
      title = [string]$existing.title
      category = [string]$existing.category
      year = [int]$existing.year
      medium = $resolvedMedium
      image = $imageRelative
      description = [string]$existing.description
    })
    continue
  }

  $category = $categoryMap[$topFolder]
  $title = To-DisplayTitle -BaseName $file.BaseName
  $medium = Infer-Medium -FileName $file.Name
  $year = $file.LastWriteTime.Year

  $newArtworks.Add([pscustomobject]@{
    id = New-ArtId -Number $nextId
    title = $title
    category = $category
    year = $year
    medium = $medium
    image = $imageRelative
    description = "Artwork by BuniMunki."
  })

  $nextId += 1
}

$data.artworks = $newArtworks.ToArray()

$featuredId = [string]$data.site.featuredArtId
if ([string]::IsNullOrWhiteSpace($featuredId) -or -not ($data.artworks | Where-Object { $_.id -eq $featuredId })) {
  if ($data.artworks.Count -gt 0) {
    $data.site.featuredArtId = $data.artworks[0].id
  }
}

$json = $data | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($dataPath, $json + [Environment]::NewLine)

if ($VerboseOutput) {
  Write-Output ("Synced artworks: {0}" -f $data.artworks.Count)
}
