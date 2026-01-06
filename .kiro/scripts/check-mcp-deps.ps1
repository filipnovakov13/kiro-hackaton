# MCP Dependencies Check Script for Windows
# This script verifies that required dependencies for MCP servers are installed

Write-Host "Checking MCP server dependencies..." -ForegroundColor Cyan
Write-Host ""

$allDepsOk = $true

# Check if uvx is available (required for AWS docs MCP server)
Write-Host "Checking uvx..." -NoNewline
if (Get-Command uvx -ErrorAction SilentlyContinue) {
    $uvxVersion = uvx --version 2>&1
    Write-Host " OK ($uvxVersion)" -ForegroundColor Green
} else {
    Write-Host " NOT FOUND" -ForegroundColor Red
    $allDepsOk = $false
    Write-Host ""
    Write-Host "uvx is required for running MCP servers." -ForegroundColor Yellow
    Write-Host "To install uv (which includes uvx), use one of these methods:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Option 1 - Using pip:" -ForegroundColor White
    Write-Host "    pip install uv" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Option 2 - Using the standalone installer:" -ForegroundColor White
    Write-Host "    irm https://astral.sh/uv/install.ps1 | iex" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Option 3 - Using winget:" -ForegroundColor White
    Write-Host "    winget install astral-sh.uv" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For more information, visit:" -ForegroundColor Yellow
    Write-Host "  https://docs.astral.sh/uv/getting-started/installation/" -ForegroundColor Cyan
    Write-Host ""
}

# Check if uv is available (parent package of uvx)
Write-Host "Checking uv..." -NoNewline
if (Get-Command uv -ErrorAction SilentlyContinue) {
    $uvVersion = uv --version 2>&1
    Write-Host " OK ($uvVersion)" -ForegroundColor Green
} else {
    Write-Host " NOT FOUND" -ForegroundColor Red
    $allDepsOk = $false
}

Write-Host ""

# Summary
if ($allDepsOk) {
    Write-Host "All MCP dependencies are installed!" -ForegroundColor Green
    Write-Host "You can now configure MCP servers in .kiro/settings/mcp.json" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "Some dependencies are missing. Please install them before using MCP servers." -ForegroundColor Red
    exit 1
}
