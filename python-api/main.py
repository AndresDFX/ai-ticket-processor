import json
import os
import re
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from langchain_community.llms import HuggingFaceHub

load_dotenv()

app = FastAPI(title="AI Support Co-Pilot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica el dominio del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TicketIn(BaseModel):
    ticket_id: Optional[str] = None
    description: str


class TicketOut(BaseModel):
    category: str
    sentiment: str
    processed: bool


def get_supabase() -> Optional[Client]:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


def llm_client() -> Optional[HuggingFaceHub]:
    token = os.getenv("HF_API_TOKEN")
    model = os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
    if not token:
        return None
    return HuggingFaceHub(repo_id=model, huggingfacehub_api_token=token)


ALLOWED_CATEGORIES = {
    "Acceso",
    "Cuenta",
    "Comercial",
    "Facturación",
    "Integraciones",
    "Móvil",
    "Rendimiento",
    "Seguridad",
    "Solicitudes",
    "Técnico",
    "UX/UI",
}

ALLOWED_SENTIMENTS = {"Positivo", "Neutral", "Negativo"}


def _simplify_text(value: str) -> str:
    return re.sub(r"\s+", "", value.strip().lower()).translate(
        str.maketrans("áéíóúüñ", "aeiouun")
    )


def normalize_text(text: str) -> str:
    replacements = {
        r"\brey\b": "",
        r"\bbro\b": "",
        r"\bmalísimo\b": "muy malo",
        r"\bmalisimo\b": "muy malo",
        r"\bno sirve\b": "no funciona",
        r"\bapp\b": "aplicacion",
    }
    normalized = text.lower()
    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def normalize_category(value: str) -> str:
    if not value:
        return ""
    simplified = _simplify_text(value)
    alias_map = {
        "tecnico": "Técnico",
        "facturacion": "Facturación",
        "comercial": "Comercial",
        "acceso": "Acceso",
        "cuenta": "Cuenta",
        "rendimiento": "Rendimiento",
        "performance": "Rendimiento",
        "ux": "UX/UI",
        "ui": "UX/UI",
        "uxui": "UX/UI",
        "usabilidad": "UX/UI",
        "seguridad": "Seguridad",
        "integraciones": "Integraciones",
        "integracion": "Integraciones",
        "movil": "Móvil",
        "mobile": "Móvil",
        "solicitudes": "Solicitudes",
        "feature": "Solicitudes",
        "request": "Solicitudes",
    }
    normalized = alias_map.get(simplified, value.strip())
    return normalized if normalized in ALLOWED_CATEGORIES else ""


def normalize_sentiment(value: str) -> str:
    if not value:
        return ""
    simplified = _simplify_text(value)
    alias_map = {
        "positivo": "Positivo",
        "positive": "Positivo",
        "neutral": "Neutral",
        "negativo": "Negativo",
        "negative": "Negativo",
    }
    normalized = alias_map.get(simplified, value.strip().capitalize())
    return normalized if normalized in ALLOWED_SENTIMENTS else ""


def classify_with_rules(text: str) -> dict:
    text_lower = text.lower()
    category = "Técnico"

    category_rules = [
        ("Facturación", ["factura", "billing", "cobro", "pago", "suscripción", "reembolso"]),
        ("Acceso", ["login", "inicio de sesión", "contraseña", "bloqueo", "2fa", "otp"]),
        ("Cuenta", ["perfil", "cuenta", "usuario", "registro", "alta", "baja"]),
        ("Integraciones", ["api", "webhook", "zapier", "slack", "integración", "integraciones"]),
        ("Rendimiento", ["lento", "latencia", "demora", "performance", "rendimiento"]),
        ("UX/UI", ["diseño", "ui", "ux", "interfaz", "botón", "boton", "pantalla"]),
        ("Seguridad", ["phishing", "fraude", "seguridad", "vulnerabilidad", "hack"]),
        ("Solicitudes", ["quiero", "me gustaría", "feature", "mejorar", "solicitud"]),
        ("Comercial", ["precio", "plan", "cotización", "ventas", "comercial"]),
        ("Móvil", ["android", "ios", "móvil", "movil", "celular"]),
        ("Técnico", ["error", "fallo", "bug", "no funciona", "no sirve", "crash"]),
    ]

    for name, keywords in category_rules:
        if any(k in text_lower for k in keywords):
            category = name
            break

    sentiment = "Neutral"
    if any(
        k in text_lower
        for k in [
            "no funciona",
            "no sirve",
            "no carga",
            "se cae",
            "error",
            "fallo",
            "mal",
            "terrible",
            "molesto",
            "horrible",
            "pésimo",
            "pesimo",
            "bug",
            "fatal",
        ]
    ):
        sentiment = "Negativo"
    if any(k in text_lower for k in ["gracias", "excelente", "genial", "perfecto", "bien", "buenísimo"]):
        sentiment = "Positivo"

    return {"category": category, "sentiment": sentiment}


def parse_json_from_text(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in response")
    return json.loads(match.group(0))


def classify_ticket(description: str) -> dict:
    normalized_text = normalize_text(description)
    llm = llm_client()
    if not llm:
        return classify_with_rules(normalized_text)

    prompt = (
        "Classify the support ticket into category and sentiment. "
        "Return ONLY valid JSON with keys: category, sentiment. "
        "Categories: Tecnico, Facturacion, Comercial, Acceso, Cuenta, Rendimiento, UX/UI, "
        "Seguridad, Integraciones, Movil, Solicitudes. "
        "Sentiment: Positivo, Neutral, Negativo.\n\n"
        f"Ticket: {normalized_text}\n"
        "JSON:"
    )
    response = llm.invoke(prompt)
    try:
        result = parse_json_from_text(response)
        category = normalize_category(result.get("category", ""))
        sentiment = normalize_sentiment(result.get("sentiment", ""))
        confidence = 1.0

        if not category or not sentiment:
            confidence = 0.0
        if "?" in response or "no estoy seguro" in response.lower():
            confidence = min(confidence, 0.4)
        if len(response) > 500:
            confidence = min(confidence, 0.5)

        threshold = float(os.getenv("LLM_CONFIDENCE_THRESHOLD", "0.6"))
        if confidence < threshold:
            return classify_with_rules(normalized_text)

        return {"category": category, "sentiment": sentiment}
    except Exception:
        return classify_with_rules(normalized_text)


def notify_n8n_if_negative(description: str, category: str, sentiment: str, ticket_id: Optional[str] = None):
    if sentiment.lower() != "negativo":
        return
    
    n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL")
    if not n8n_webhook_url:
        return
    
    try:
        payload = {
            "description": description,
            "category": category,
            "sentiment": sentiment,
        }
        if ticket_id:
            payload["id"] = ticket_id
        
        requests.post(
            n8n_webhook_url,
            json=payload,
            timeout=5,
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        print(f"Warning: No se pudo notificar a n8n: {e}")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/create-ticket", response_model=dict)
def create_ticket(ticket: TicketIn):
    if not ticket.description:
        raise HTTPException(status_code=400, detail="description is required")

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    ticket_data = {
        "description": ticket.description,
        "processed": False,
    }
    result = supabase.table("tickets").insert(ticket_data).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create ticket")
    
    ticket_id = result.data[0]["id"]

    classification = classify_ticket(ticket.description)
    
    supabase.table("tickets").update(
        {
            "category": classification["category"],
            "sentiment": classification["sentiment"],
            "processed": True,
        }
    ).eq("id", ticket_id).execute()

    notify_n8n_if_negative(
        ticket.description,
        classification["category"],
        classification["sentiment"],
        ticket_id
    )

    return {
        "ticket_id": ticket_id,
        "category": classification["category"],
        "sentiment": classification["sentiment"],
        "processed": True,
    }


@app.post("/process-ticket", response_model=TicketOut)
def process_ticket(ticket: TicketIn):
    if not ticket.description:
        raise HTTPException(status_code=400, detail="description is required")

    result = classify_ticket(ticket.description)
    processed = True

    supabase = get_supabase()
    if ticket.ticket_id and supabase:
        supabase.table("tickets").update(
            {
                "category": result["category"],
                "sentiment": result["sentiment"],
                "processed": True,
            }
        ).eq("id", ticket.ticket_id).execute()

    notify_n8n_if_negative(
        ticket.description,
        result["category"],
        result["sentiment"],
        ticket.ticket_id
    )

    return TicketOut(
        category=result["category"],
        sentiment=result["sentiment"],
        processed=processed,
    )
