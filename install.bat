@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "SOURCE=%SCRIPT_DIR%dist\teotools"
set "TARGET=%SCRIPT_DIR%..\teotools"

if not exist "%SOURCE%" (
    echo ERROR: Source folder not found: %SOURCE%
    exit /b 1
)

if exist "%TARGET%" (
    echo WARNING: %TARGET% already exists.
    set /p CONFIRM="Overwrite? (y/n): "
    if /i not "%CONFIRM%"=="y" (
        echo Aborted.
        exit /b 0
    )
    rmdir "%TARGET%"
)

mklink /J "%TARGET%" "%SOURCE%"

if %errorlevel% equ 0 (
    echo Installed successfully.
    echo Junction created: %TARGET% -^> %SOURCE%
) else (
    echo ERROR: Failed to create junction.
    exit /b 1
)
