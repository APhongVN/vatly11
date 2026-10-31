param(
  [Parameter(Mandatory = $true)]
  [string]$DocxPath,
  [string]$CurriculumPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'src/lib/data/curriculum.json')
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $DocxPath -PathType Leaf)) { throw "DOCX source not found: $DocxPath" }
if (-not (Test-Path -LiteralPath $CurriculumPath -PathType Leaf)) { throw "Curriculum JSON not found: $CurriculumPath" }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $DocxPath).Path)
try {
  $entry = $zip.GetEntry('word/document.xml')
  if (-not $entry) { throw 'DOCX does not contain word/document.xml.' }
  $stream = $entry.Open()
  try {
    $document = [System.Xml.XmlDocument]::new()
    $document.Load($stream)
  } finally {
    $stream.Dispose()
  }
} finally {
  $zip.Dispose()
}

$namespaces = [System.Xml.XmlNamespaceManager]::new($document.NameTable)
$namespaces.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$docRows = [System.Collections.Generic.List[string]]::new()
$body = $document.SelectSingleNode('/w:document/w:body', $namespaces)
foreach ($block in $body.ChildNodes) {
  if ($block.LocalName -eq 'p') {
    $paragraphText = ($block.SelectNodes('.//w:t', $namespaces) | ForEach-Object { $_.InnerText }) -join ''
    if (-not [string]::IsNullOrWhiteSpace($paragraphText)) { $docRows.Add($paragraphText) }
  } elseif ($block.LocalName -eq 'tbl') {
    foreach ($row in $block.SelectNodes('./w:tr', $namespaces)) {
      $cells = foreach ($cell in $row.SelectNodes('./w:tc', $namespaces)) {
        ($cell.SelectNodes('.//w:t', $namespaces) | ForEach-Object { $_.InnerText }) -join ''
      }
      $rowText = $cells -join ' | '
      if (-not [string]::IsNullOrWhiteSpace($rowText)) { $docRows.Add($rowText) }
    }
  }
}

$firstActivityIndex = -1
for ($index = 0; $index -lt $docRows.Count; $index++) {
  if ($docRows[$index] -match '^HOẠT ĐỘNG\s+1\.') { $firstActivityIndex = $index; break }
}
if ($firstActivityIndex -lt 0) { throw 'Could not find HOẠT ĐỘNG 1 in the DOCX.' }
$activityRows = @($docRows | Select-Object -Skip $firstActivityIndex)
$activityHeadings = @($activityRows | Where-Object { $_ -match '^HOẠT ĐỘNG\s+\d+\.' })

$curriculum = Get-Content -LiteralPath $CurriculumPath -Raw | ConvertFrom-Json
$sourceHeadings = @($curriculum | ForEach-Object { $_.sourceSections })
$curriculumRows = [System.Collections.Generic.List[string]]::new()
foreach ($activity in $curriculum) {
  foreach ($block in $activity.blocks) {
    if ($block.type -eq 'paragraph') {
      $curriculumRows.Add([string]$block.text)
    } elseif ($block.type -eq 'table') {
      foreach ($row in $block.rows) { $curriculumRows.Add((@($row) -join ' | ')) }
    }
  }
}

if ($activityHeadings.Count -ne 14 -or $sourceHeadings.Count -ne 14) {
  throw "Expected 14 DOCX activity sections; found $($activityHeadings.Count) DOCX headings and $($sourceHeadings.Count) mapped sections."
}
$headingDifference = @(Compare-Object -ReferenceObject $activityHeadings -DifferenceObject $sourceHeadings)
if ($headingDifference.Count -gt 0) { throw 'DOCX activity headings and curriculum sourceSections differ.' }
if ($activityRows.Count -ne $curriculumRows.Count) {
  throw "DOCX and curriculum row counts differ: $($activityRows.Count) versus $($curriculumRows.Count)."
}

for ($index = 0; $index -lt $activityRows.Count; $index++) {
  $docText = [regex]::Replace($activityRows[$index].Normalize([Text.NormalizationForm]::FormKC), '\s+', '')
  $webText = [regex]::Replace($curriculumRows[$index].Normalize([Text.NormalizationForm]::FormKC), '\s+', '')
  if ($docText -cne $webText) { throw "DOCX content mismatch at activity content row $index." }
}

$activityEight = $curriculum | Where-Object { $_.id -eq 8 }
$mergedNumbers = @($activityEight.sourceSections | ForEach-Object { [int]($_ -replace '^HOẠT ĐỘNG\s+(\d+)\..*$', '$1') })
if (($mergedNumbers -join ',') -ne '8,9,10,11') { throw 'Web activity 8 does not map source activities 8 through 11.' }
if ($curriculum.Count -ne 11) { throw "Expected 11 web activities after merging; found $($curriculum.Count)." }

Write-Output "DOCX content verified: 14 source sections, 11 web activities, activities 8–11 merged, and $($activityRows.Count) paragraphs/table rows matched."
