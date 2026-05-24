"""FastAPI: условные энтропии + AES + статика (если есть)."""

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Относительные импорты (файлы aes_protocol.py и conditional_entropy.py лежат рядом)
from .aes_protocol import aes_decrypt, aes_encrypt, random_iv_hex
from .conditional_entropy import compute_conditional_entropies

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR_CANDIDATES = [
    BASE_DIR / "static",
    BASE_DIR / "frontend" / "dist",
    BASE_DIR / "dist",
]

static_dir = next((p for p in STATIC_DIR_CANDIDATES if p.exists() and p.is_dir()), None)

app = FastAPI(title="Theor Info", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AesEncryptRequest(BaseModel):
    plaintext: str = ""
    passphrase: str
    key_bits: int = Field(default=256, ge=128, le=256)
    iv_hex: str = ""


class AesDecryptRequest(BaseModel):
    ciphertext: str = ""
    passphrase: str
    key_bits: int = Field(default=256, ge=128, le=256)


class EntropyRequest(BaseModel):
    matrix: list[list[float]] | str = ""
    labels_x: list[str] = Field(default_factory=list)
    labels_y: list[str] = Field(default_factory=list)


@app.get("/api/health")
def health():
    return {"status": "ok", "backend": "python"}


@app.post("/api/entropy/compute")
def api_entropy_compute(body: EntropyRequest):
    try:
        lx = body.labels_x if body.labels_x else None
        ly = body.labels_y if body.labels_y else None
        return compute_conditional_entropies(body.matrix, lx, ly)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/aes/random-iv")
def api_random_iv():
    return {"ivHex": random_iv_hex()}


@app.post("/api/aes/encrypt")
def api_aes_encrypt(body: AesEncryptRequest):
    try:
        if body.key_bits not in (128, 192, 256):
            raise ValueError("Длина ключа AES: 128, 192 или 256 бит")
        return aes_encrypt(body.plaintext, body.passphrase, body.key_bits, body.iv_hex)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/aes/decrypt")
def api_aes_decrypt(body: AesDecryptRequest):
    try:
        if body.key_bits not in (128, 192, 256):
            raise ValueError("Длина ключа AES: 128, 192 или 256 бит")
        return aes_decrypt(body.ciphertext, body.passphrase, body.key_bits)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Ошибка расшифровки (неверный ключ или данные)",
        ) from exc


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Backend is running",
        "docs": "/docs",
        "health": "/api/health",
    }


if static_dir is not None:
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
