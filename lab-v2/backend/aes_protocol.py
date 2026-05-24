"""AES-CBC шифрование и дешифрование (FIPS-197) через cryptography."""

from __future__ import annotations

import base64
import hashlib
import os
from typing import Any

from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


VALID_KEY_BITS = (128, 192, 256)


def _validate_key_bits(key_bits: int) -> None:
    if key_bits not in VALID_KEY_BITS:
        raise ValueError("Длина ключа AES: 128, 192 или 256 бит")


def derive_aes_key(passphrase: str, key_bits: int) -> bytes:
    _validate_key_bits(key_bits)
    if not passphrase:
        raise ValueError("Введите ключ (парольную фразу)")
    digest = hashlib.sha256(passphrase.encode("utf-8")).digest()
    return digest[: key_bits // 8]


def bytes_to_hex(data: bytes) -> str:
    return data.hex()


def hex_to_bytes(hex_str: str) -> bytes:
    clean = hex_str.replace(" ", "")
    if len(clean) % 2 != 0:
        raise ValueError("IV: только hex-пары")
    try:
        return bytes.fromhex(clean)
    except ValueError as exc:
        raise ValueError("IV: только hex-пары") from exc


def random_iv_hex() -> str:
    return bytes_to_hex(os.urandom(16))


def aes_encrypt(
    plaintext: str,
    passphrase: str,
    key_bits: int = 256,
    iv_hex: str = "",
) -> dict[str, Any]:
    key = derive_aes_key(passphrase, key_bits)
    data = plaintext.encode("utf-8")

    if iv_hex:
        iv = hex_to_bytes(iv_hex)
        if len(iv) != 16:
            raise ValueError("IV должен быть 16 байт (32 hex-символа)")
    else:
        iv = os.urandom(16)

    padder = padding.PKCS7(128).padder()
    padded = padder.update(data) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    packed = iv + ciphertext
    return {
        "ciphertext": base64.b64encode(packed).decode("ascii"),
        "ivHex": bytes_to_hex(iv),
        "mode": "CBC",
        "keyBits": key_bits,
    }


def aes_decrypt(
    ciphertext_b64: str,
    passphrase: str,
    key_bits: int = 256,
) -> dict[str, Any]:
    key = derive_aes_key(passphrase, key_bits)
    packed = base64.b64decode(ciphertext_b64.strip())

    if len(packed) < 17:
        raise ValueError("Слишком короткий шифротекст для CBC")

    iv = packed[:16]
    ciphertext = packed[16:]

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    padded = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    data = unpadder.update(padded) + unpadder.finalize()

    return {
        "plaintext": data.decode("utf-8"),
        "ivHex": bytes_to_hex(iv),
        "mode": "CBC",
        "keyBits": key_bits,
    }
