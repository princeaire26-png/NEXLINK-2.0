# Run elevated on the NEXLINK Server host. Restricts discovery/API ingress to LocalSubnet.
[CmdletBinding()]
param([ValidateRange(1,65535)][int]$ApiPort = 3001)
$ErrorActionPreference = 'Stop'
$rules = @(
  @{ Name = 'NEXLINK mDNS Discovery UDP 5353'; Port = 5353; Protocol = 'UDP' },
  @{ Name = "NEXLINK Server API TCP $ApiPort"; Port = $ApiPort; Protocol = 'TCP' }
)
foreach ($rule in $rules) {
  Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Action Allow -Enabled True -Profile Domain,Private -Protocol $rule.Protocol -LocalPort $rule.Port -RemoteAddress LocalSubnet | Out-Null
}
Write-Host 'NEXLINK LocalSubnet firewall rules installed.' -ForegroundColor Cyan
