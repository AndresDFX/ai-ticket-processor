# 🚀 Guía Rápida - Vivatori Support Co-Pilot

## 📋 Prerrequisitos

- Docker y Docker Compose instalados
- Cuenta en Supabase (gratis): https://supabase.com
- (Opcional) Token de Hugging Face para usar modelos LLM: https://huggingface.co/settings/tokens

---

## ⚡ Inicio Rápido (5 minutos)

### Paso 1: Configurar Supabase

1. Crea un proyecto en https://supabase.com
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/setup.sql`:
   ```sql
   -- Copia y pega todo el contenido de supabase/setup.sql
   ```
3. (Opcional) Ejecuta `supabase/seed.sql` para datos de prueba

### Paso 2: Obtener Credenciales de Supabase

1. En tu proyecto de Supabase, ve a **Settings** → **API**
2. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (secreto) → `SUPABASE_SERVICE_ROLE_KEY`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### Paso 3: Configurar Variables de Entorno

**API (`python-api/.env`):**
```bash
cd vivatori
cp python-api/.env.example python-api/.env
# Edita python-api/.env con tus credenciales
```

**Frontend (`frontend/.env`):**
```bash
cp frontend/.env.example frontend/.env
# Edita frontend/.env con tus credenciales
```

### Paso 4: Iniciar con Docker Compose

**Opción A: Script automático**
```bash
chmod +x start.sh
./start.sh
```

**Opción B: Manual**
```bash
docker compose up --build
```

### Paso 5: Abrir el Dashboard

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

---

## 🌍 Opciones Local vs Cloud (Frontend / API / n8n)

### ✅ Local (desarrollo)
- **API**: Docker Compose o `uvicorn` local en `http://localhost:8001`
- **Frontend**: Vite en `http://localhost:5173`
- **n8n**: Docker local `http://localhost:5678`
- **Config env frontend**: `VITE_API_URL=http://localhost:8001`

### ☁️ Cloud (producción)
- **API (Render)**: URL pública de Render `https://tu-api.onrender.com`
- **Frontend (Vercel/Netlify)**: URL pública del dashboard
- **n8n Cloud**: Workflow en n8n Cloud y webhook público
- **Config env frontend**: `VITE_API_URL=https://tu-api.onrender.com`

## 🧪 Probar el Sistema

### 1. Insertar un ticket manualmente en Supabase

Ve a **Table Editor** → `tickets` → **Insert row**:
- `description`: "No funciona el login"
- `category`: null
- `sentiment`: null
- `processed`: false

### 2. Procesar el ticket vía API

```bash
curl -X POST http://localhost:8001/process-ticket \
  -H "Content-Type: application/json" \
  -d '{"description": "No funciona el login"}'
```

O con `ticket_id` para actualizar Supabase:
```bash
curl -X POST http://localhost:8001/process-ticket \
  -H "Content-Type: application/json" \
  -d '{"ticket_id": "uuid-del-ticket", "description": "No funciona el login"}'
```

### 3. Ver en tiempo real

El dashboard en http://localhost:5173 se actualizará automáticamente gracias a Supabase Realtime.

Si no ves actualizaciones en tiempo real, ejecuta en el SQL Editor:
```sql
alter table public.tickets replica identity full;
alter publication supabase_realtime add table public.tickets;
```

---

## 🔄 Configurar n8n (workflow) - Paso a paso

### Opción A: n8n en local con Docker (recomendado)
1. Ejecuta n8n:
   ```bash
   docker run -it --rm -p 5678:5678 n8nio/n8n
   ```
2. Abre n8n en el navegador: http://localhost:5678
3. En n8n, haz clic en **Import** → **From File** y selecciona `n8n-workflow/workflow.json`.
4. Abre el nodo **Webhook** y copia la **URL de producción** (ejemplo: `http://localhost:5678/webhook/xxx`).
5. Abre el nodo **HTTP Request** y coloca la URL de la API:
   - Si la API corre en Docker: `http://host.docker.internal:8001/process-ticket`
   - Si la API corre sin Docker: `http://localhost:8001/process-ticket`
6. Abre el nodo **Email** (simulado) y revisa que el asunto/mensaje estén OK.
7. Activa el workflow con el botón **Active** (arriba a la derecha).
8. Prueba el flujo enviando un POST al webhook:
   ```bash
   curl -X POST "http://localhost:5678/webhook/xxx" \
     -H "Content-Type: application/json" \
     -d '{"description": "No funciona el login y estoy molesto"}'
   ```
9. Verifica en n8n que el flujo se ejecutó y que el nodo de email se disparó.

### Opción B: n8n Cloud (si tienes cuenta)
1. Entra a tu workspace de n8n Cloud.
2. Importa `n8n-workflow/workflow.json` desde **Import** → **From File**.
3. Abre el nodo **HTTP Request** y coloca la URL de la API pública (Render/Railway/Vercel).
4. Activa el workflow.
5. Usa la URL del **Webhook** de n8n Cloud para probar con `curl`.

---

## ☁️ Deploy rápido (Render + Vercel + n8n Cloud)

### API en Render (requerido por la prueba)
1. Crea un **Web Service** en Render.
2. Conecta el repo y selecciona `/python-api`.
3. Build command:
   ```bash
   pip install -r requirements.txt
   ```
4. Start command:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8001
   ```
5. Configura variables de entorno (ver `python-api/ENV_EXAMPLE.md`).
6. Guarda la URL pública para usarla en frontend y n8n.

### Frontend en Vercel/Netlify
1. Importa el repo y selecciona `/frontend`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Agrega variables de entorno (ver `frontend/ENV_EXAMPLE.md`).

### n8n Cloud
1. Importa `n8n-workflow/workflow.json`.
2. En el nodo **HTTP Request**, usa la URL pública de Render.
3. Activa el workflow y prueba con el webhook.

## 🔧 Desarrollo Local (sin Docker)

### API Python

```bash
cd python-api
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edita .env con tus credenciales
uvicorn main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edita .env con tus credenciales
npm run dev
```

---

## 🐛 Troubleshooting

### Error: "No such file or directory: .env"
- Asegúrate de haber copiado `.env.example` a `.env` en ambas carpetas
- Verifica que los archivos `.env` tengan las credenciales correctas

### Error: "Connection refused" en Supabase
- Verifica que `SUPABASE_URL` y las keys sean correctas
- Asegúrate de haber ejecutado `setup.sql` en Supabase

### El dashboard no muestra tickets
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén correctos
- Abre la consola del navegador (F12) para ver errores

### La API no procesa tickets (falla LLM)
- Si no tienes `HF_API_TOKEN`, el sistema usa clasificación por reglas (keywords)
- Esto es normal y funcional, solo menos preciso que usar un LLM

### Docker no inicia
- Verifica que Docker esté corriendo: `docker ps`
- Revisa logs: `docker compose logs`

---

## 📚 Próximos Pasos

1. **Configurar n8n**: Importa `n8n-workflow/workflow.json` y conecta el webhook
2. **Desplegar a producción**: Ver sección "Deploy" en `README.md`
3. **Personalizar categorías**: Edita `classify_with_rules()` en `python-api/main.py`

---

## 📞 Soporte

Si tienes problemas, revisa:
- Logs de Docker: `docker compose logs`
- Consola del navegador (F12)
- Logs de Supabase en el dashboard
