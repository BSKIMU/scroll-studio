"""Serve the one-time generated local catalog; no runtime inference or uploads."""
from pathlib import Path

CATALOG=Path(__file__).resolve().parent.parent/'local/hand-library/catalog.json'
MANO=Path(__file__).resolve().parent.parent/'local/mano-runtime/models/fit-candidates.json'

def get(handler):
    source={'/api/hand-library/catalog':CATALOG,'/api/hand-library/mano-fit':MANO}.get(handler.path)
    if source is None or not source.is_file():return handler.send_error(404)
    return handler.send_data(source.read_bytes(),'application/json; charset=utf-8')
