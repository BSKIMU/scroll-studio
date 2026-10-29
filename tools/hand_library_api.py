"""Serve the one-time generated local catalog; no runtime inference or uploads."""
from pathlib import Path

CATALOG=Path(__file__).resolve().parent.parent/'local/hand-library/catalog.json'

def get(handler):
    if handler.path!='/api/hand-library/catalog' or not CATALOG.is_file():return handler.send_error(404)
    return handler.send_data(CATALOG.read_bytes(),'application/json; charset=utf-8')
