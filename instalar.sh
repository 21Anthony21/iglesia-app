#!/bin/bash

echo "========================================"
echo "  Instalación Iglesia App - Local"
echo "========================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no está instalado."
    echo "Descárgalo desde: https://nodejs.org (versión LTS)"
    echo "Ejecuta el instalador y vuelve a correr este script."
    exit 1
fi

NODE_VER=$(node -v)
echo "[OK] Node.js detectado: $NODE_VER"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm no está instalado."
    exit 1
fi

echo "[OK] npm detectado: $(npm -v)"
echo ""

# Obtener IP local para acceso desde tablet
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
echo "========================================"
echo "  INSTALANDO DEPENDENCIAS..."
echo "========================================"
echo ""

cd "$(dirname "$0")/backend"
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Falló la instalación. Revisa el mensaje de error."
    read -p "Presiona Enter para salir..."
    exit 1
fi

echo ""
echo "========================================"
echo "  INSTALACIÓN COMPLETADA"
echo "========================================"
echo ""
echo "Usuarios disponibles al iniciar:"
echo "  admin@iglesia.com / admin123   (Administrador)"
echo "  anthony@iglesia.com / admin123  (Administrador)"
echo ""
echo "Para iniciar el servidor:"
echo "  node backend/src/index.js"
echo ""
echo "Luego abre en tu navegador:"
echo "  http://localhost:3000"
if [ -n "$IP" ]; then
    echo "  http://$IP:3000   (desde la tablet u otros dispositivos)"
fi
echo ""
echo "Presiona Ctrl+C para detener el servidor."
echo ""
