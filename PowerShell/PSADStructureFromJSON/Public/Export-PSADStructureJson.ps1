function Export-ADStructureJson {
    <#
    .SYNOPSIS
        Exports an AD structure object to a JSON file.
    .DESCRIPTION
        Serializes an AD structure (PSCustomObject or hashtable) to a JSON file.
        Uses a default depth of 20, which comfortably covers any realistic OU tree depth.
    .PARAMETER InputObject
        The AD structure object to serialize.
    .PARAMETER Path
        Destination file path.
    .PARAMETER Depth
        JSON serialization depth. Default is 20.
    .PARAMETER Force
        Overwrite the file if it already exists.
    .EXAMPLE
        Export-ADStructureJson -InputObject $tree -Path .\output.json
        Export-ADStructureJson -InputObject $tree -Path .\output.json -Force
    #>
    [CmdletBinding(SupportsShouldProcess = $true)]
    param(
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        $InputObject,

        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Path,

        [Parameter()]
        [ValidateRange(1, 100)]
        [int]$Depth = 20,

        [Parameter()]
        [switch]$Force
    )

    if ((Test-Path -Path $Path -PathType Leaf) -and -not $Force) {
        throw "File already exists: $Path. Use -Force to overwrite."
    }

    $parentDir = Split-Path -Path $Path -Parent
    if ($parentDir -and -not (Test-Path -Path $parentDir -PathType Container)) {
        throw "Destination directory does not exist: $parentDir"
    }

    if ($PSCmdlet.ShouldProcess($Path, 'Write AD structure JSON')) {
        $json = $InputObject | ConvertTo-Json -Depth $Depth
        $json | Out-File -FilePath $Path -Encoding UTF8 -Force:$Force
    }
}
