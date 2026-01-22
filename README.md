# AI-Powered Support Co-Pilot

Sistema de procesamiento automático de tickets de soporte con IA, dashboard en tiempo real y automatización con n8n.

## ✨ Características Destacadas

- **Dashboard Moderno**: Interfaz responsiva con animaciones suaves, tema oscuro accesible y navegación intuitiva.
- **Experiencia de Usuario Mejorada**: Notificaciones en tiempo real, búsqueda de tickets, modales para detalles y indicadores visuales con iconos.
- **Accesibilidad**: Soporte completo para navegación por teclado, etiquetas ARIA y alto contraste.
- **Animaciones Fancy**: Transiciones fluidas con Framer Motion para una experiencia interactiva premium.
- **Componentes Interactivos**: Botones con estados de carga, spinners animados y feedback visual inmediato.

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
4. **Abre**: http://localhost:5200

## 📁 Estructura

- `supabase/`: esquema SQL y seed
- `python-api/`: microservicio FastAPI + LangChain
- `n8n-workflow/`: flujo de automatización exportado
- `frontend/`: dashboard React + Vite + Tailwind con mejoras UX/UI (animaciones, notificaciones, modales)
- `docker-compose.yml`: orquestación local
- `start.sh`: script de inicio rápido
- `setup-env.sh`: script para crear archivos .env

## 📝 URLs de entrega (completa cuando despliegues)
- Dashboard: https://ai-ticket-processor.vercel.app/
- API Python: https://ai-ticket-processor.onrender.com/docs

## 🎨 Mejoras en el Frontend

### UX/UI Enhancements
- **Tema Oscuro/Claro**: Toggle completo entre modos oscuro y claro con persistencia local.
- **Header Moderno**: Banner con gradiente azul, logo mejorado y toggle de tema integrado.
- **Logo Rediseñado**: SVG personalizado representando IA y soporte con gradientes.
- **Animaciones Suaves**: Entradas y salidas animadas con Framer Motion para una experiencia fluida.
- **Notificaciones Toast**: Feedback visual inmediato para acciones exitosas, errores y eventos en tiempo real.
- **Modal de Detalles**: Vista expandida de tickets con información completa en un modal centrado.
- **Búsqueda en Tiempo Real**: Filtrado instantáneo de tickets por descripción o categoría.
- **Grid Responsivo**: Vista de tarjetas en grid (1 columna móvil, 2 tablet, 3 desktop) para mejor organización visual.
- **Paginación**: Navegación paginada con controles anterior/siguiente y contador de páginas.
- **Iconos Significativos**: Indicadores visuales con Lucide React para estados de sentimiento y procesamiento.
- **Estados de Carga**: Spinners animados y botones con indicadores de progreso.

### Tecnologías Añadidas
- **Framer Motion**: Para animaciones y transiciones premium.
- **Lucide React**: Conjunto de iconos modernos y accesibles.
- **Tailwind CSS Extendido**: Configuración personalizada con colores primarios y fuente Inter.

### Accesibilidad
- Etiquetas ARIA completas para lectores de pantalla.
- Navegación por teclado con focus-visible.
- Alto contraste en todos los elementos interactivos.

## 🧠 Clasificación Inteligente
- Normalización de jerga antes de clasificar (ej. "rey", "bro", "malísimo").
- Umbral de confianza configurable para LLM (`LLM_CONFIDENCE_THRESHOLD`).
- Fallback automático a reglas cuando el modelo es ambiguo.
- Categorías ampliadas para tickets: Acceso, Cuenta, Facturación, Comercial, Técnico, Rendimiento, UX/UI, Seguridad, Integraciones, Móvil y Solicitudes.

## 🔔 Notificaciones Automáticas (n8n)

El sistema está integrado con **n8n** para enviar notificaciones por email automáticamente:

- **Cuándo se activa**: Cuando un ticket es procesado y tiene sentimiento **"Negativo"**
- **Cómo funciona**: 
  1. El frontend crea un ticket (o se procesa vía API)
  2. La API clasifica el ticket con IA
  3. Si el sentimiento es "Negativo", la API llama automáticamente al webhook de n8n
  4. n8n procesa el webhook (sin llamar a la API) y envía un email de alerta
- **Configuración**: Agrega `N8N_WEBHOOK_URL` en las variables de entorno de la API (ver `python-api/ENV_EXAMPLE.md`)
- Si no configuras `N8N_WEBHOOK_URL`, el sistema funciona pero no envía emails
- **Payload**: n8n recibe los datos en `body` (`body.description`, `body.category`, `body.sentiment`, `body.id`)
- **Telegram**: el workflow incluye envío opcional por Telegram (configura `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en n8n).

## 🐳 Docker Compose (Recomendado)

```bash
docker compose up --build
```

- Frontend: http://localhost:5200
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
1) Importa `n8n-workflow/workflow.json` en n8n Cloud.
2) Configura el nodo **Email** con tus credenciales SMTP (Gmail recomendado).
3) Activa el workflow y copia la **URL del webhook** (Production URL).
4) Agrega `N8N_WEBHOOK_URL` en las variables de entorno de la API en Render.
5) **Listo**: Ahora cuando crees un ticket con sentimiento negativo desde el frontend, recibirás un email automáticamente.

## Variables de entorno
- API: `python-api/ENV_EXAMPLE.md`
- Frontend: `frontend/ENV_EXAMPLE.md`
