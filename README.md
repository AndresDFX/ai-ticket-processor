# AI-Powered Support Co-Pilot (Vivatori)

Sistema de procesamiento automático de tickets de soporte con IA, dashboard en tiempo real y automatización con n8n.

## 🚀 Inicio Rápido

**👉 Ver [QUICKSTART.md](./QUICKSTART.md) para instrucciones detalladas paso a paso.**

### Resumen rápido:

1. **Configura Supabase**: Ejecuta `supabase/setup.sql` en SQL Editor
2. **Crea archivos `.env`**:
   ```bash
   chmod +x setup-env.sh
   ./setup-env.sh
   # Edita python-api/.env y frontend/.env con tus credenciales
   ```
3. **Inicia con Docker**:
   ```bash
   docker compose up --build
   ```
   O usa el script:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
4. **Abre**: http://localhost:5173

## 📁 Estructura

- `supabase/`: esquema SQL y seed
- `python-api/`: microservicio FastAPI + LangChain
- `n8n-workflow/`: flujo de automatización exportado
- `frontend/`: dashboard React + Vite + Tailwind
- `docker-compose.yml`: orquestación local
- `start.sh`: script de inicio rápido
- `setup-env.sh`: script para crear archivos .env

## 📝 URLs de entrega (completa cuando despliegues)
- Dashboard: [PENDIENTE]
- API Python: [PENDIENTE]

## 🧠 Prompt Engineering

El modelo recibe un prompt estricto para devolver **JSON** con `category` y `sentiment`:
- **Categorías**: Técnico, Facturación, Comercial
- **Sentimiento**: Positivo, Neutral, Negativo

**Fallback**: Si el LLM no está disponible, se usa clasificación basada en reglas (keywords).

## 🐳 Docker Compose (Recomendado)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:8001
- API Docs: http://localhost:8001/docs

## 🔧 Desarrollo Local (sin Docker)

Ver [QUICKSTART.md](./QUICKSTART.md) para instrucciones detalladas.

## 📊 Seed de Datos

**Opción 1: SQL directo**
En Supabase SQL Editor, ejecuta `supabase/seed.sql`

**Opción 2: Vía API** (requiere API corriendo)
```bash
chmod +x seed-api.sh
./seed-api.sh
```

## Deploy (resumen)
- **API Python**: Render / Railway / Vercel (FastAPI)
- **Frontend**: Vercel / Netlify
- **n8n**: instancia local o cloud (importar workflow)

## Deploy paso a paso (sugerido)

### API (Render)
1) Crea un nuevo **Web Service**.
2) Conecta el repo y selecciona `/python-api`.
3) Build command:
```
pip install -r requirements.txt
```
4) Start command:
```
uvicorn main:app --host 0.0.0.0 --port 8001
```
5) Configura variables de entorno (ver `python-api/ENV_EXAMPLE.md`).

### Frontend (Vercel)
1) Importa el repo y selecciona `/frontend`.
2) Build command: `npm run build`
3) Output directory: `dist`
4) Configura variables de entorno (ver `frontend/ENV_EXAMPLE.md`).

### n8n
1) Importa `n8n-workflow/workflow.json`.
2) Configura el webhook y la URL de la API.
3) Prueba con un ticket de ejemplo.

## Variables de entorno
- API: `python-api/ENV_EXAMPLE.md`
- Frontend: `frontend/ENV_EXAMPLE.md`
