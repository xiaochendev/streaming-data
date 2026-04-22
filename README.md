
# Streaming Data

# Setup
1. copy this project
```
git clone https://github.com/xiaochendev/streaming-data.git
```

2. install required packages
```
npm install && npm start
```
# Terminal 1 — Python server
cd datafeed/
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 datafeed/server.py

# Terminal 2 — React app
npm install
npm run dev
# → http://localhost:3000

Used FastAPI server replaced old Python HTTP server with CORS, SSE(server-sent events) streaming in 100 ms(no more client polling), and ratio+bounds computed on server, then auto-reload with uvicorn.

| Layer         | Old                                      | Refactored                                      |
|---------------|------------------------------------------|--------------------------------------------------|
| Backend       | BaseHTTPRequestHandler                  | FastAPI + Uvicorn                               |
| Frontend      | XHR polling every 100ms                 | Server-Sent Events (SSE)                        |
| TypeScript    | TS 3.2                                 | TS 5.4                                          |
| Charting      | @jpmorganchase/perspective 0.2.12       | Recharts 2                                      |
| Node          | v11                                    | v20 (TLS)                                       |
| Data Dedup    | Missing                                | Map keyed on stock + timestamp                  |
| Ratio/Bounds  | Manual patch                           | Computed server-side and streamed               |


- package.json - Used React 18 + Vite + TS + Recharts replaced old CRA + Perspective
- tsconfig.json - Typescript 5 onfig
- tsconfig.node.json - Vite config compilation
- vite.config.ts - Vite config

## Details:
- datafeed/server.py - FastAPI replaces the old BaseHTTPRequestHandler. Two endpoints: /query (legacy single-shot, backward compatible) and /stream (SSE, pushes every 100ms). Ratio, upper/lower bounds, and alert detection are all computed here in _compute_ratio_row() using a rolling 200-tick window.

- src/DataStreamer.ts — Wraps the browser's native EventSource API instead of XMLHttpRequest. DataStreamer.start() opens the SSE connection and returns a cleanup function for React effects. The old getData() is still exported for any code that needs it.

- src/useSSEFeed.ts — The core hook. Manages the SSE lifecycle, fixes Goal A (deduplication via Map<stock, ServerRespond> — one entry per stock, never duplicates), accumulates ratio history, and exposes startStreaming / stopStreaming actions. This is the single source of truth that replaces the class component's getDataFromServer() + setInterval.

- src/Graph.tsx — Recharts ComposedChart with three data series: the ratio line (blue), upper/lower bounds (yellow dashed), and <ReferenceLine> vertical red markers at every alert timestamp. Red dots also appear on the ratio line at crossing points. This resolves Goals C and Task 3 in full.

- src/StockTable.tsx — Simple table consuming the deduplicated stockMap. Since it's a Map not an array, rendering it is always duplicate-free by construction.

- src/App.tsx — Functional component with a single toggle button. No more one-shot-per-click behaviour — streaming starts and runs continuously until stopped.