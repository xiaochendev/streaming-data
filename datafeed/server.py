"""
Modern datafeed server — FastAPI + SSE replacement for the legacy
BaseHTTPRequestHandler / server3.py setup.

Original: Python 2/3 BaseHTTPRequestHandler, no CORS, no streaming,
          manual CSV parsing, XHR polling every 100 ms from client.

Modern:   FastAPI, CORS middleware, Server-Sent Events endpoint,
          server-side push every 100 ms, ratio + bounds computed here,
          auto-reload with uvicorn.

Run:
    python3 -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn
    python3 datafeed/server.py
"""

import asyncio
import csv
import json
import os
import random
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="JPMC Streaming Datafeed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Data — either replay test.csv (if present) or generate synthetic ticks
# ---------------------------------------------------------------------------

DATA_FILE = Path(__file__).parent.parent / "test.csv"

STOCKS = ["ABC", "DEF"]

# Seed prices
_prices: dict[str, dict] = {
    "ABC": {"ask": 120.0, "bid": 119.5},
    "DEF": {"ask": 240.0, "bid": 239.0},
}

# Ratio history for rolling bounds (12-period window as a stand-in for
# the 12-month window described in the task)
_ratio_history: list[float] = []
WINDOW = 200  # ticks to consider for upper/lower bounds


def _next_price(stock: str) -> dict:
    """Simulate a realistic random walk with mean reversion."""
    p = _prices[stock]
    spread = round(random.uniform(0.3, 0.8), 2)
    drift = random.gauss(0, 0.15)
    base_ask = round(p["ask"] + drift, 2)
    base_ask = max(base_ask, 1.0)
    p["ask"] = base_ask
    p["bid"] = round(base_ask - spread, 2)
    return {
        "stock": stock,
        "top_ask": {"price": p["ask"], "size": random.randint(100, 1000)},
        "top_bid": {"price": p["bid"], "size": random.randint(100, 1000)},
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def _load_csv_rows() -> list[dict]:
    """Load test.csv rows if the file exists, else return empty list."""
    if not DATA_FILE.exists():
        return []
    rows = []
    with open(DATA_FILE, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


_csv_rows = _load_csv_rows()
_csv_idx = 0


def _get_row_pair() -> list[dict]:
    """Return one row per stock per tick, either from CSV or synthetic."""
    global _csv_idx
    result = []
    if _csv_rows:
        for stock in STOCKS:
            # scan forward until we find a row for this stock
            for _ in range(len(_csv_rows)):
                row = _csv_rows[_csv_idx % len(_csv_rows)]
                _csv_idx += 1
                if row.get("stock", "").strip().upper() == stock:
                    result.append(
                        {
                            "stock": stock,
                            "top_ask": {
                                "price": float(row.get("top_ask_price", 0) or 0),
                                "size": int(float(row.get("top_ask_size", 0) or 0)),
                            },
                            "top_bid": {
                                "price": float(row.get("top_bid_price", 0) or 0),
                                "size": int(float(row.get("top_bid_size", 0) or 0)),
                            },
                            "timestamp": row.get("timestamp", datetime.utcnow().isoformat()),
                        }
                    )
                    break
    else:
        for stock in STOCKS:
            result.append(_next_price(stock))
    return result


# ---------------------------------------------------------------------------
# Ratio + bounds computation
# ---------------------------------------------------------------------------


def _compute_ratio_row(rows: list[dict]) -> dict | None:
    """
    Given a pair of rows [ABC, DEF], compute:
      ratio           = ABC.ask / DEF.ask
      upper_bound     = rolling avg * 1.10
      lower_bound     = rolling avg * 0.90
      trigger_alert   = ratio outside bounds
    """
    by_stock = {r["stock"]: r for r in rows}
    abc = by_stock.get("ABC")
    def_ = by_stock.get("DEF")
    if not abc or not def_:
        return None

    ask_abc = abc["top_ask"]["price"]
    ask_def = def_["top_ask"]["price"]
    if ask_def == 0:
        return None

    ratio = ask_abc / ask_def
    _ratio_history.append(ratio)
    if len(_ratio_history) > WINDOW:
        _ratio_history.pop(0)

    avg = sum(_ratio_history) / len(_ratio_history)
    upper = avg * 1.10
    lower = avg * 0.90
    alert = ratio > upper or ratio < lower

    return {
        "timestamp": abc["timestamp"],
        "ratio": round(ratio, 6),
        "upper_bound": round(upper, 6),
        "lower_bound": round(lower, 6),
        "trigger_alert": alert,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {"status": "ok", "source": "csv" if _csv_rows else "synthetic"}


@app.get("/query")
def query_once():
    """
    Legacy single-shot endpoint — mirrors the original /query?id=N path.
    Returns one tick's data for both stocks + computed ratio row.
    """
    rows = _get_row_pair()
    ratio_row = _compute_ratio_row(rows)
    return {"rows": rows, "ratio": ratio_row}


@app.get("/stream")
async def stream_sse():
    """
    Server-Sent Events endpoint — pushes one tick every 100 ms.
    Replaces the client-side setInterval polling entirely.
    """

    async def event_generator() -> AsyncGenerator[str, None]:
        while True:
            rows = _get_row_pair()
            ratio_row = _compute_ratio_row(rows)
            payload = json.dumps({"rows": rows, "ratio": ratio_row})
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.1)  # 100 ms 

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8080, reload=True)