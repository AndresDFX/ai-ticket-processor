#!/bin/bash

echo "🚀 Iniciando AI Support Co-Pilot..."

# Verificar que existan los archivos .env
if [ ! -f "python-api/.env" ]; then
    echo "⚠️  No existe python-api/.env"
    echo "📝 Copiando python-api/.env.example a python-api/.env"
    cp python-api/.env.example python-api/.env
    echo "✏️  Por favor edita python-api/.env con tus credenciales reales"
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo "⚠️  No existe frontend/.env"
    echo "📝 Copiando frontend/.env.example a frontend/.env"
    cp frontend/.env.example frontend/.env
    echo "✏️  Por favor edita frontend/.env con tus credenciales reales"
    exit 1
fi

echo "✅ Archivos .env encontrados"
echo "🐳 Iniciando con Docker Compose..."
docker compose up --build
