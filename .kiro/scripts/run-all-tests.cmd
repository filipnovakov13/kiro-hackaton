@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Iubar Unified Test Runner
echo ========================================
echo.

set "PROJECT_ROOT=%~dp0..\.."
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"
set "VENV_PYTHON=%PROJECT_ROOT%\.venv\Scripts\python.exe"

set BACKEND_PASSED=0
set FRONTEND_PASSED=0
set ALL_PASSED=1

REM Run Backend Tests
echo [Backend Tests]
echo Directory: %BACKEND_DIR%

if exist "%VENV_PYTHON%" (
    pushd "%BACKEND_DIR%"
    "%VENV_PYTHON%" -m pytest -v
    if !errorlevel! equ 0 (
        set BACKEND_PASSED=1
        echo [PASS] Backend tests PASSED
    ) else (
        echo [FAIL] Backend tests FAILED
        set ALL_PASSED=0
    )
    popd
) else (
    echo [ERROR] Python virtual environment not found
    set ALL_PASSED=0
)

echo.

REM Run Frontend Tests
echo [Frontend Tests]
echo Directory: %FRONTEND_DIR%

if exist "%FRONTEND_DIR%\package.json" (
    pushd "%FRONTEND_DIR%"
    call npm run test
    if !errorlevel! equ 0 (
        set FRONTEND_PASSED=1
        echo [PASS] Frontend tests PASSED
    ) else (
        echo [FAIL] Frontend tests FAILED
        set ALL_PASSED=0
    )
    popd
) else (
    echo [ERROR] Frontend package.json not found
    set ALL_PASSED=0
)

echo.
echo ========================================
echo   Test Summary
echo ========================================

if !BACKEND_PASSED! equ 1 (
    echo   Backend:  PASSED
) else (
    echo   Backend:  FAILED
)

if !FRONTEND_PASSED! equ 1 (
    echo   Frontend: PASSED
) else (
    echo   Frontend: FAILED
)

echo ========================================

if !ALL_PASSED! equ 1 (
    echo All tests passed!
    exit /b 0
) else (
    echo Some tests failed!
    exit /b 1
)
