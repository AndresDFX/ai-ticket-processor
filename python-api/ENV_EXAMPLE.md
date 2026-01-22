# Variables de entorno (ejemplo)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
HF_API_TOKEN=your-hf-api-token
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2
PORT=8001
N8N_WEBHOOK_URL=https://tu-workspace.n8n.cloud/webhook/support-copilot-webhook
LLM_CONFIDENCE_THRESHOLD=0.6
```

**Nota sobre N8N_WEBHOOK_URL**: 
- Es opcional. Si no está configurada, el sistema funcionará normalmente pero no enviará notificaciones por email.
- Obtén la URL del webhook desde tu workflow de n8n Cloud (nodo Webhook → Production URL).
