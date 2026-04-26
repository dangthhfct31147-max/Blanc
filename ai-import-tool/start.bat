@echo off
echo ContestHub AI Import Tool
echo.

REM Check if .env exists
if not exist ".env" (
    echo [SETUP] Tao file .env tu .env.example...
    copy .env.example .env
    echo [!] Hay mo file .env va dien SERVER_URL va AI_IMPORT_API_KEY truoc khi chay.
    pause
    exit /b 1
)

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo [SETUP] Tao virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo [SETUP] Cai dat dependencies...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

REM Check configured AI provider
set AI_PROVIDER=ollama
for /f "tokens=2 delims==" %%A in ('findstr /B "AI_PROVIDER=" .env 2^>nul') do set AI_PROVIDER=%%A

if /I "%AI_PROVIDER%"=="codex" (
    codex --version >nul 2>&1
    if errorlevel 1 (
        echo [!] Khong tim thay Codex CLI. Hay cai dat/dang nhap Codex CLI hoac doi AI_PROVIDER trong .env.
        pause
        exit /b 1
    )
) else if /I "%AI_PROVIDER%"=="auto" (
    ollama list >nul 2>&1
    if errorlevel 1 (
        codex --version >nul 2>&1
        if errorlevel 1 (
            echo [!] Khong co Ollama hoac Codex CLI kha dung.
            echo     Hay chay Ollama hoac cau hinh Codex CLI.
            pause
            exit /b 1
        )
    )
) else (
    ollama list >nul 2>&1
    if errorlevel 1 (
        echo [!] Ollama chua chay. Hay chay: ollama serve
        echo     Hoac dat AI_PROVIDER=codex trong .env de dung Codex fallback.
        pause
        exit /b 1
    )
)

echo [OK] Khoi dong Gradio UI tai http://127.0.0.1:7860
python app.py
