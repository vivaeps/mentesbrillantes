@echo off
setlocal
cd /d "%~dp0"

python -m pip install --upgrade pyinstaller
python -m PyInstaller --noconfirm --clean --onefile --windowed --name "MentesBrillantes" ^
  --add-data "index.html;." ^
  --add-data "contenido-v3.json;." ^
  --add-data "css;css" ^
  --add-data "js;js" ^
  --add-data "image;image" ^
  lanzar.py

echo.
echo Listo: dist\MentesBrillantes.exe
pause
