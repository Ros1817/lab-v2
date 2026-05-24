"""FastAPI: условные энтропии + AES + статика."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from aes_protocol import aes_decrypt, aes_encrypt, random_iv_hex
from conditional_entropy import compute_conditional_entropies

ROOT = Path(__file__).resolve().parent.parent

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
    key_bits: int = Field(256, ge=128, le=256)
    iv_hex: str = ""


class AesDecryptRequest(BaseModel):
    ciphertext: str = ""
    passphrase: str
    key_bits: int = Field(256, ge=128, le=256)


class EntropyRequest(BaseModel):
    matrix: str | list[list[float]] = ""
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


app.mount("/", StaticFiles(directory=str(ROOT), html=True), name="static")
