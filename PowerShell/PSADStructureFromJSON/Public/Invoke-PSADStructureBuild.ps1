[CmdletBinding()]
param(
	[Parameter(Mandatory=$false,HelpMessage="Specify the path to the JSON file to use when building the structure.")]
	[path]$FilePath
)

[HashTable]$JsonStructure = $null

if( !$PSBoundParameters.ContainsKey("$FilePath") -and ![string]::IsNullOrEmpty($PWD) ) {
	$FilePath = $PWD
}

if( !(Test-Path -Path $FilePath) ) {
	$PSCmdlet.ThrowTerminatingError("Unable to locate the JSON file at $FilePath")
}
else {
	try {
		$JsonStructure = Import-PSADStructure -Path $FilePath -AsHashtable -ErrorAction Stop
	}
	catch {
		Write-Error -Message "Failed to import the JSON data as an AD Structure - $($PSItem.Exception.Message)"
		return
	}
}
# elseif( (Get-Item -Path $FilePath -ErrorAction Stop).Extension -ne 'json' ) {

# }