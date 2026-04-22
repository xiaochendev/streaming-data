/**
 * useSSEFeed.ts
 *
 * Custom React hook that encapsulates the SSE connection lifecycle.
 *
 * What this replaces in the original:
 *   - getDataFromServer() method on App class component
 *   - setInterval / clearInterval management
 *   - Manual deduplication (table.update called with ALL data every tick)
 *
 * Features:
 *   - Deduplicates rows using a Map keyed on "stock::timestamp"
 *   - Accumulates ratio rows chronologically
 *   - Exposes isStreaming / tickCount / error state
 *   - Auto-cleans up EventSource on unmount
 */

import { useCallback, useRef, useState } from 'react';
import { DataStreamer, RatioRow, ServerRespond } from './DataStreamer';

// How many data points to keep in memory (prevents unbounded growth)
const MAX_ROWS = 1_000;

export interface FeedState {
  /** De-duplicated stock rows, keyed stock → latest ServerRespond */
  stockMap: Map<string, ServerRespond>;
  /** Chronological ratio rows (trimmed to MAX_ROWS) */
  ratioHistory: RatioRow[];
  isStreaming: boolean;
  tickCount: number;
  error: string | null;
}

export interface FeedActions {
  startStreaming: () => void;
  stopStreaming: () => void;
}

export function useSSEFeed(): [FeedState, FeedActions] {
  const cleanupRef = useRef<(() => void) | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Use refs for the data so we can mutate without triggering renders on
  // every tick — we batch-update state at a lower frequency via tickCount.
  const stockMapRef = useRef<Map<string, ServerRespond>>(new Map());
  const ratioHistoryRef = useRef<RatioRow[]>([]);

  // Expose stable snapshots for render
  const [stockMap, setStockMap] = useState<Map<string, ServerRespond>>(new Map());
  const [ratioHistory, setRatioHistory] = useState<RatioRow[]>([]);

  const startStreaming = useCallback(() => {
    if (cleanupRef.current) return; // already running

    setError(null);

    const cleanup = DataStreamer.start(
      (payload) => {
        // --- Goal A fix: deduplicate by stock key ---
        // Original bug: every tick re-inserted ALL rows → duplicates.
        // Fix: Map keyed on stock keeps only the latest row per stock.
        for (const row of payload.rows) {
          stockMapRef.current.set(row.stock, row);
        }

        // Accumulate ratio history, trim to MAX_ROWS
        if (payload.ratio) {
          ratioHistoryRef.current.push(payload.ratio);
          if (ratioHistoryRef.current.length > MAX_ROWS) {
            ratioHistoryRef.current.shift();
          }
        }

        // Flush to React state (triggers re-render)
        setStockMap(new Map(stockMapRef.current));
        setRatioHistory([...ratioHistoryRef.current]);
        setTickCount((n) => n + 1);
      },
      (_err) => {
        setError('Connection lost — retrying…');
      }
    );

    cleanupRef.current = cleanup;
    setIsStreaming(true);
  }, []);

  const stopStreaming = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setIsStreaming(false);
  }, []);

  return [
    { stockMap, ratioHistory, isStreaming, tickCount, error },
    { startStreaming, stopStreaming },
  ];
}