$credLines = @(
    "protocol=https",
    "host=github.com",
    ""
)
$output = $credLines | git credential fill
$tokenLine = $output | Where-Object { $_ -match "^password=(.+)$" }

if (-not $tokenLine) {
    Write-Host "Failed to retrieve GitHub token from credential manager."
    exit 1
}

$token = $matches[1]

$body = @{
    name = "Health-One-Portal-A-Java-Based-Application"
    description = "Health-One Portal: Java Enterprise EHR & Clinical Decision Support System with React Frontend"
    private = $false
    has_issues = $true
    has_projects = $true
    has_wiki = $true
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "HealthOneApp"
}

try {
    $res = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "SUCCESS: Created repository $($res.html_url)"
} catch {
    Write-Host "API Request Failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())"
    }
}
