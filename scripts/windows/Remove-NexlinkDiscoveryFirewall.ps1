[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Get-NetFirewallRule -DisplayName 'NEXLINK mDNS Discovery UDP 5353' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Get-NetFirewallRule -DisplayName 'NEXLINK Server API TCP *' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Write-Host 'NEXLINK firewall rules removed.' -ForegroundColor Cyan
