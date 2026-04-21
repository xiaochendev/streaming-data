
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
