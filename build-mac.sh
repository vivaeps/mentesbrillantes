#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

python3 -m pip install --upgrade pyinstaller
python3 -m PyInstaller --noconfirm --clean --windowed --name "MentesBrillantes" \
  --add-data "index.html:." \
  --add-data "contenido-v3.json:." \
  --add-data "css:css" \
  --add-data "js:js" \
  --add-data "image:image" \
  lanzar.py

echo
echo "Listo: dist/MentesBrillantes.app"
echo "Para probar: open dist/MentesBrillantes.app"
