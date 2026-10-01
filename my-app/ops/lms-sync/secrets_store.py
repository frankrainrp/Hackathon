"""Browser sessions stay encrypted on disk. Windows DPAPI binds to this user.

Other OSes require LMS_STATE_KEY (Fernet key) supplied by the host secret store.
No passwords, cookies or authentication headers are written to logs.
"""
import ctypes
import json
import os
from pathlib import Path


class Blob(ctypes.Structure):
    _fields_ = [("size", ctypes.c_ulong), ("data", ctypes.POINTER(ctypes.c_ubyte))]


def _dpapi(data: bytes, decrypt: bool) -> bytes:
    buffer = ctypes.create_string_buffer(data)
    src = Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte)))
    dst = Blob()
    crypt = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    kernel.LocalFree.restype = ctypes.c_void_p
    fn = crypt.CryptUnprotectData if decrypt else crypt.CryptProtectData
    fn.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p,
                   ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ulong, ctypes.POINTER(Blob)]
    fn.restype = ctypes.c_int
    if not fn(ctypes.byref(src), None, None, None, None, 1, ctypes.byref(dst)):
        raise RuntimeError("Session encryption failed; use the same Windows account.")
    try:
        return ctypes.string_at(dst.data, dst.size)
    finally:
        kernel.LocalFree(dst.data)


def protect(data: bytes) -> bytes:
    if os.name == "nt":
        return b"DPAPI1\n" + _dpapi(data, False)
    from cryptography.fernet import Fernet
    return b"FERNET1\n" + Fernet(os.environ["LMS_STATE_KEY"].encode()).encrypt(data)


def unprotect(data: bytes) -> bytes:
    kind, payload = data.split(b"\n", 1)
    if kind == b"DPAPI1" and os.name == "nt":
        return _dpapi(payload, True)
    if kind == b"FERNET1":
        from cryptography.fernet import Fernet
        return Fernet(os.environ["LMS_STATE_KEY"].encode()).decrypt(payload)
    raise RuntimeError("Unsupported session encryption on this host.")


def save_secret(path: Path, value: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".tmp")
    temp.write_bytes(protect(json.dumps(value).encode()))
    if os.name != "nt":
        temp.chmod(0o600)
    temp.replace(path)


def load_secret(path: Path) -> dict:
    return json.loads(unprotect(path.read_bytes()))
