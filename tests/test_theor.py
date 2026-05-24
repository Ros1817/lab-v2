"""Тесты: условные энтропии и AES."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from aes_protocol import aes_decrypt, aes_encrypt  # noqa: E402
from conditional_entropy import compute_conditional_entropies  # noqa: E402


def test_entropy_independent():
    matrix = [
        [0.1, 0.1],
        [0.2, 0.2],
        [0.15, 0.15],
    ]
    r = compute_conditional_entropies(matrix)
    assert abs(r["entropy"]["H_X_given_Y"] - r["entropy"]["H_X"]) < 1e-5
    assert abs(r["entropy"]["H_Y_given_X"] - r["entropy"]["H_Y"]) < 1e-5


def test_entropy_known_2x2():
    matrix = [[0.5, 0.0], [0.0, 0.5]]
    r = compute_conditional_entropies(matrix, ["A", "B"], ["0", "1"])
    assert abs(r["entropy"]["H_XY"] - 1.0) < 1e-5
    assert abs(r["entropy"]["H_X_given_Y"] - 0.0) < 1e-5


def test_aes_roundtrip():
    for bits in (128, 192, 256):
        t = f"Hello AES {bits}"
        e = aes_encrypt(t, "pass", bits)
        d = aes_decrypt(e["ciphertext"], "pass", bits)
        assert d["plaintext"] == t


if __name__ == "__main__":
    test_entropy_independent()
    test_entropy_known_2x2()
    test_aes_roundtrip()
    print("OK: all tests passed")
