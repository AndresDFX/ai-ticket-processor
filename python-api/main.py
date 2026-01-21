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

app = FastAPI(title="Vivatori AI Support Co-Pilot")

# CORS para permitir requests del frontend
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


def classify_with_rules(text: str) -> dict:
    text_lower = text.lower()
    category = "Técnico"
    if any(k in text_lower for k in ["factura", "billing", "cobro", "pago", "suscripción"]):
        category = "Facturación"
    if any(k in text_lower for k in ["precio", "plan", "cotización", "ventas", "comercial"]):
        category = "Comercial"

    sentiment = "Neutral"
    if any(k in text_lower for k in ["no funciona", "error", "fallo", "mal", "terrible", "molesto"]):
        sentiment = "Negativo"
    if any(k in text_lower for k in ["gracias", "excelente", "genial", "perfecto", "bien"]):
        sentiment = "Positivo"

    return {"category": category, "sentiment": sentiment}


def parse_json_from_text(text: str) -> dict:
    # Busca el primer bloque JSON en la respuesta
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in response")
    return json.loads(match.group(0))


def classify_ticket(description: str) -> dict:
    llm = llm_client()
    if not llm:
        return classify_with_rules(description)

    prompt = (
        "Classify the support ticket into category and sentiment. "
        "Return ONLY valid JSON with keys: category, sentiment. "
        "Categories: Tecnico, Facturacion, Comercial. "
        "Sentiment: Positivo, Neutral, Negativo.\n\n"
        f"Ticket: {description}\n"
        "JSON:"
    )
    response = llm.invoke(prompt)
    try:
        result = parse_json_from_text(response)
        category = result.get("category", "Tecnico")
        sentiment = result.get("sentiment", "Neutral")
        return {"category": category, "sentiment": sentiment}
    except Exception:
        return classify_with_rules(description)


def notify_n8n_if_negative(description: str, category: str, sentiment: str, ticket_id: Optional[str] = None):
    """Notifica a n8n si el sentimiento es negativo para enviar email de alerta"""
    if sentiment.lower() != "negativo":
        return
    
    n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL")
    if not n8n_webhook_url:
        # Si no está configurado, no hace nada (no es crítico)
        return
    
    try:
        payload = {
            "description": description,
            "category": category,
            "sentiment": sentiment,
        }
        if ticket_id:
            payload["id"] = ticket_id
        
        # Llamada asíncrona, no bloquea la respuesta
        requests.post(
            n8n_webhook_url,
            json=payload,
            timeout=5,
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        # Log del error pero no falla el procesamiento del ticket
        print(f"Warning: No se pudo notificar a n8n: {e}")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/create-ticket", response_model=dict)
def create_ticket(ticket: TicketIn):
    """Crea un ticket en Supabase y lo procesa automáticamente"""
    if not ticket.description:
        raise HTTPException(status_code=400, detail="description is required")

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Crear ticket en Supabase
    ticket_data = {
        "description": ticket.description,
        "processed": False,
    }
    result = supabase.table("tickets").insert(ticket_data).execute()
    
    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create ticket")
    
    ticket_id = result.data[0]["id"]

    # Procesar el ticket
    classification = classify_ticket(ticket.description)
    
    # Actualizar con la clasificación
    supabase.table("tickets").update(
        {
            "category": classification["category"],
            "sentiment": classification["sentiment"],
            "processed": True,
        }
    ).eq("id", ticket_id).execute()

    # Notificar a n8n si el sentimiento es negativo
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
    """Procesa un ticket existente (por ID) o solo clasifica si no hay ID"""
    if not ticket.description:
        raise HTTPException(status_code=400, detail="description is required")

    result = classify_ticket(ticket.description)
    processed = True

    # Update in Supabase if ticket_id provided
    supabase = get_supabase()
    if ticket.ticket_id and supabase:
        supabase.table("tickets").update(
            {
                "category": result["category"],
                "sentiment": result["sentiment"],
                "processed": True,
            }
        ).eq("id", ticket.ticket_id).execute()

    # Notificar a n8n si el sentimiento es negativo
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
