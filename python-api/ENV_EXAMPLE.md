# Variables de entorno (ejemplo)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
HF_API_TOKEN=your-hf-api-token
HF_MODEL=mistralai/Ministral-3-3B-Instruct-2512
# Para Hugging Face Router (por defecto):
LLM_API_BASE_URL=https://router.huggingface.co/v1/chat/completions
# Si el modelo no es "chat", se puede usar completions:
# LLM_API_BASE_URL=https://router.huggingface.co/v1/completions
# Para vLLM local (sin token):
# LLM_API_BASE_URL=http://localhost:8000/v1/chat/completions
# LLM_API_TOKEN=optional-if-your-endpoint-requires-it
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=200
# Modelo por defecto: Ministral-3-3B-Instruct-2512 (optimizado para edge, 4B parámetros, FP8)
# Modelos alternativos disponibles en Hugging Face Router:
# - mistralai/Ministral-3-8B-Instruct-2512 (mayor capacidad, 9B parámetros)
# - mistralai/Mistral-7B-Instruct-v0.3 (modelo anterior, compatible)
PORT=8001
N8N_WEBHOOK_URL=https://tu-workspace.n8n.cloud/webhook/support-copilot-webhook
LLM_CONFIDENCE_THRESHOLD=0.6
```

**Nota sobre N8N_WEBHOOK_URL**: 
- Es opcional. Si no está configurada, el sistema funcionará normalmente pero no enviará notificaciones por email.
- Obtén la URL del webhook desde tu workflow de n8n Cloud (nodo Webhook → Production URL).
