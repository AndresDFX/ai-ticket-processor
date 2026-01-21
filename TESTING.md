# 🧪 Guía de Testing - Vivatori

## ✅ Checklist Pre-Testing

- [ ] Supabase configurado y `setup.sql` ejecutado
- [ ] Archivos `.env` creados (`python-api/.env` y `frontend/.env`)
- [ ] Credenciales de Supabase configuradas
- [ ] Docker y Docker Compose instalados

## 🚀 Inicio Rápido

```bash
# 1. Crear archivos .env
chmod +x setup-env.sh
./setup-env.sh

# 2. Editar credenciales en python-api/.env y frontend/.env

# 3. Iniciar servicios
docker compose up --build
```

## 📋 Tests Manuales

### Test 1: Health Check de la API
```bash
curl http://localhost:8001/health
```
**Esperado**: `{"status":"ok"}`

### Test 2: Crear Ticket desde Frontend
1. Abre http://localhost:5173
2. Escribe un ticket en el formulario: "No funciona el login"
3. Click en "Crear Ticket"
4. **Esperado**: El ticket aparece en la lista con categoría y sentimiento

### Test 3: Crear Ticket vía API
```bash
curl -X POST http://localhost:8001/create-ticket \
  -H "Content-Type: application/json" \
  -d '{"description": "Necesito factura de este mes"}'
```
**Esperado**: JSON con `ticket_id`, `category`, `sentiment`, `processed: true`

### Test 4: Realtime Updates
1. Abre el dashboard en http://localhost:5173
2. En otra terminal, crea un ticket vía API (Test 3)
3. **Esperado**: El ticket aparece automáticamente sin refrescar

### Test 5: Seed de Datos
```bash
chmod +x seed-api.sh
./seed-api.sh
```
**Esperado**: 3 tickets creados y procesados

### Test 6: Clasificación por Reglas (sin LLM)
Si no configuraste `HF_API_TOKEN`, el sistema usa reglas:
- "No funciona el login" → Técnico, Negativo
- "Necesito factura" → Facturación, Neutral
- "¿Tienen descuentos?" → Comercial, Positivo

## 🔍 Verificación de Logs

### API Logs
```bash
docker compose logs python-api
```

### Frontend Logs
```bash
docker compose logs frontend
```

## 🐛 Troubleshooting

### El formulario no crea tickets
- Verifica que `VITE_API_URL` esté en `frontend/.env` (o usa el default)
- Abre la consola del navegador (F12) para ver errores
- Verifica que la API esté corriendo: `curl http://localhost:8001/health`

### Los tickets no se actualizan en tiempo real
- Verifica `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `frontend/.env`
- Verifica que Realtime esté habilitado en Supabase (Settings → API → Realtime)

### La API no procesa tickets
- Verifica `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `python-api/.env`
- Sin `HF_API_TOKEN`, el sistema usa reglas (funciona pero menos preciso)

## 📊 Verificación en Supabase

1. Ve a **Table Editor** → `tickets`
2. Verifica que los tickets tengan:
   - `category` (Técnico, Facturación, Comercial)
   - `sentiment` (Positivo, Neutral, Negativo)
   - `processed: true`

## ✅ Tests Exitosos

Si todos los tests pasan, el sistema está funcionando correctamente:
- ✅ API responde
- ✅ Frontend se conecta a Supabase
- ✅ Tickets se crean y procesan
- ✅ Realtime funciona
- ✅ Clasificación funciona (con o sin LLM)
