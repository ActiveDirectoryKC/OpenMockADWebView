function Import-ADStructureJson {
    <#
    .SYNOPSIS
        Imports an AD structure definition from a JSON file.
    .DESCRIPTION
        Reads a JSON file describing an Active Directory OU/Container tree and returns
        the parsed structure as a PSCustomObject or, with -AsHashtable, as nested ordered
        hashtables. Compatible with PowerShell 5.1 which lacks ConvertFrom-Json -AsHashtable.
    .PARAMETER Path
        Path to the JSON file.
    .PARAMETER AsHashtable
        Return nested ordered hashtables instead of PSCustomObjects.
    .EXAMPLE
        $tree = Import-ADStructureJson -Path .\lab.poolmanjim.com.json
        $hash = Import-ADStructureJson -Path .\lab.poolmanjim.com.json -AsHashtable
    #>
    [CmdletBinding()]
    [OutputType([PSCustomObject], [System.Collections.Specialized.OrderedDictionary])]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]$Path,

        [Parameter()]
        [switch]$AsHashtable
    )

    if (-not (Test-Path -Path $Path -PathType Leaf)) {
        throw "File not found: $Path"
    }

    $raw = Get-Content -Path $Path -Raw -ErrorAction Stop

    try {
        $object = $raw | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        throw "Failed to parse JSON from '$Path': $($_.Exception.Message)"
    }

    foreach ($required in @('Name', 'Type', 'Children')) {
        if ($null -eq $object.PSObject.Properties[$required]) {
            throw "JSON file is missing required root property '$required': $Path"
        }
    }

    if ($AsHashtable) {
        return ConvertTo-Hashtable -InputObject $object
    }

    return $object
}
