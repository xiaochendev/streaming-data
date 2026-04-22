
# Streaming Data 
- Generated a chart that displays the data feed in a clear and visually appealing manner for traders to monitor this trading strategy:
    - auto track and display the ratio between the two stock prices.
    - show the historical upper and lower bounds of the stocks' ratio.
    - show 'alerts' whenever these bounds are crossed by the ratio.
- Refactored, but remain same functionality
# Setup
1. Copy this project
```
git clone https://github.com/xiaochendev/streaming-data.git
```
2. Backend- install dependencies in venv (required python3.10+)
```
cd datafeed/
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
3. Backend - run server
```
python3 datafeed/server.py
```
#### Note: keep server running

4. Frontend — install dependencies (required Node.js 20+)
```
cd ../streaming-data
npm install
npm run dev
```
#### viewable in http://localhost:5173
!(https://github.com/xiaochendev/streaming-data/view.gif)

# Summary 
### Original tasks - 
- Bugs fixed, includes:
    1. clicking "start streaming" re-appends all old rows, causing duplicate in the Perspective table(fixs: use table.update() with deduplication by timestamp+stock key)
    2. data only fetched once per button click(fix: wrap DataStreamer.getData in a setInterval(..., 100)loop)
    3. show ratio of ABC/DEF ask prices, rolling upper/lower bounds(±10% of 12-period avg),and red alert lines when bounds are crossed

### Refactored, but remain same functionality
1. Used FastAPI server replaced old Python HTTP server with CORS, SSE(server-sent events) streaming in 100 ms(no more client polling), and ratio+bounds computed on server, then auto-reload with uvicorn.
2. Used React 18 + Vite + TS + Recharts replaced old CRA + Perspective
3. Stack choices:

| Layer                             | Old                           | Refactored                     | Pros (Upgrade Benefits)                                                                                                                                                                                                                          | Cons / Tradeoffs                                                                                                                                               |
| --------------------------------- | ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                           | BaseHTTPRequestHandler        | FastAPI + Uvicorn              | Async-native streaming (SSE becomes trivial via `StreamingResponse`), higher concurrency (ASGI model), Pydantic type validation, cleaner architecture with centralized `_compute_ratio_row()`, auto OpenAPI/Swagger docs, better maintainability | Slight framework abstraction overhead, async complexity can introduce subtle concurrency bugs, more dependencies than stdlib server                            |
| Data delivery                     | XHR polling (100ms intervals) | Server-Sent Events (SSE)       | Persistent connection reduces network overhead, near real-time updates, simpler than WebSockets (unidirectional), lower latency, fewer HTTP handshakes → better scalability                                                                      | Unidirectional only (needs separate POST/GET for client→server), browser connection limits (~6 SSE connections/domain), text-only protocol (no binary framing) |
| Node runtime                      | Node v11                      | Node v20                       | Modern V8 performance improvements, native `fetch`, better TLS/security defaults, improved GC & memory handling, LTS stability                                                                                                                   | Ecosystem breaking changes, older dependencies may require upgrades or polyfills                                                                               |
| TypeScript                        | TS 3.2                        | TS 5.4                         | Much stronger type inference, improved generics/conditional types, faster compiler, better React + hooks typing, fewer runtime bugs due to stricter checks                                                                                       | Migration friction due to stricter compiler rules, legacy weakly-typed code requires refactoring                                                               |
| Charting                          | Perspective (0.2.12)          | Recharts (2.x)                 | React-native declarative charts, easier customization (alerts, markers, overlays), better maintainability and readability, simpler mental model                                                                                                  | Loss of high-performance WebGL/grid engine, less optimal for massive datasets (millions of rows), weaker built-in columnar optimizations                       |
| Data deduplication                | Not implemented               | `Map<stock, row>`              | O(1) overwrite semantics, prevents duplicate rendering bugs, stable React rendering via consistent keys, avoids frontend drift between views                                                                                                     | Slight memory overhead vs arrays, requires transformation when exporting to chart/table formats                                                                |
| Server computation (ratio/bounds) | Manual client patching        | Server-side computed streaming | Single source of truth, deterministic outputs across clients, reduced frontend complexity, better performance (computed once per tick instead of per client), consistent rolling window logic                                                    | Less client-side flexibility for experimentation, higher backend CPU responsibility                                                                            |
| Frontend framework                | CRA / older React setup       | React 18 + Vite                | Instant dev server startup, extremely fast HMR (ESM-based), smaller build overhead, concurrent rendering support, better SSE compatibility with streaming UI patterns                                                                            | Less “batteries included” than CRA, more explicit configuration responsibility                                                                                 |
| Frontend architecture             | Class-based polling system    | `useSSEFeed` hook system       | Centralized streaming state, lifecycle-safe connection management, no polling drift bugs, React 18 concurrent-safe updates, easier testing via isolated hook logic                                                                               | Hooks can become complex without modular design, requires discipline to avoid tightly coupled state logic                                                      |


## Details:
- datafeed/server.py - FastAPI replaces the old BaseHTTPRequestHandler. Two endpoints: /query (legacy single-shot, backward compatible) and /stream (SSE, pushes every 100ms). Ratio, upper/lower bounds, and alert detection are all computed here in _compute_ratio_row() using a rolling 200-tick window.

- src/DataStreamer.ts — Wraps the browser's native EventSource API instead of XMLHttpRequest. DataStreamer.start() opens the SSE connection and returns a cleanup function for React effects. The old getData() is still exported for any code that needs it.

- src/useSSEFeed.ts — The core hook. Manages the SSE lifecycle, fixes Goal A (deduplication via Map<stock, ServerRespond> — one entry per stock, never duplicates), accumulates ratio history, and exposes startStreaming / stopStreaming actions. This is the single source of truth that replaces the class component's getDataFromServer() + setInterval.

- src/Graph.tsx — Recharts ComposedChart with three data series: the ratio line (blue), upper/lower bounds (yellow dashed), and <ReferenceLine> vertical red markers at every alert timestamp. Red dots also appear on the ratio line at crossing points. This resolves Goals C and Task 3 in full.

- src/StockTable.tsx — Simple table consuming the deduplicated stockMap. Since it's a Map not an array, rendering it is always duplicate-free by construction.

- src/App.tsx — Functional component with a single toggle button. No more one-shot-per-click behaviour — streaming starts and runs continuously until stopped.

## Directory Structure
```
streaming-data/
├── datafeed/            # Backend directory (Python server)
│   └── server.py
│
├── src/                 # Frontend React components (Vite + React 18 + TypeScript)
│   └── ...
│
├── package.json         # Frontend dependencies and scripts (React 18 + Vite + TypeScript + Recharts)
├── tsconfig.json        # TypeScript configuration (main)
├── tsconfig.node.json   # TypeScript config for Vite/Node environment
└── vite.config.ts       # Vite build configuration
```

# Technologies
- Node.js
- React 18
- Vite
- Typescript 5
