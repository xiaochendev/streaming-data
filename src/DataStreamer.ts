/**
 * DataStreamer.ts
 *
 * Original: Used XMLHttpRequest to poll /query?id=N every 100 ms from
 *           the component. No deduplication, no streaming, no cleanup.
 *
 * Refactor:   Wraps the browser's native EventSource API (SSE).
 *           The server pushes ticks every 100 ms — no client-side
 *           setInterval needed at all.
 *
 *           Exports both:
 *             - DataStreamer class (drop-in for existing code)
 *             - ServerRespond / RatioRow types
 */

// ---------------------------------------------------------------------------
// Types — match server JSON shape exactly
// ---------------------------------------------------------------------------

export interface PriceLevel {
  price: number;
  size: number;
}

export interface ServerRespond {
  stock: string;
  top_ask: PriceLevel;
  top_bid: PriceLevel;
  timestamp: string;
}

export interface RatioRow {
  timestamp: string;
  ratio: number;
  upper_bound: number;
  lower_bound: number;
  trigger_alert: boolean;
}

export interface TickPayload {
  rows: ServerRespond[];
  ratio: RatioRow | null;
}

// ---------------------------------------------------------------------------
// SSE-based DataStreamer
// ---------------------------------------------------------------------------

type TickCallback = (payload: TickPayload) => void;
type ErrorCallback = (err: Event) => void;

export class DataStreamer {
  private static _source: EventSource | null = null;

  /**
   * Start streaming.  Calls `onTick` for every server-sent tick.
   * Returns a cleanup function — call it to stop streaming.
   *
   * Replaces the old getDataFromServer() + setInterval pattern.
   */
  static start(
    onTick: TickCallback,
    onError?: ErrorCallback,
    endpoint = '/stream'
  ): () => void {
    // Close any existing connection
    DataStreamer.stop();

    const source = new EventSource(endpoint);
    DataStreamer._source = source;

    source.onmessage = (event: MessageEvent) => {
      try {
        const payload: TickPayload = JSON.parse(event.data as string);
        onTick(payload);
      } catch {
        // Malformed JSON from server — skip tick
      }
    };

    source.onerror = (err) => {
      onError?.(err);
    };

    // Return cleanup fn so React effects can call it on unmount
    return () => DataStreamer.stop();
  }

  static stop(): void {
    if (DataStreamer._source) {
      DataStreamer._source.close();
      DataStreamer._source = null;
    }
  }

  /**
   * Legacy single-shot fetch — kept for backwards compatibility with
   * any code that still calls DataStreamer.getData().
   */
  static async getData(): Promise<TickPayload> {
    const res = await fetch('/query');
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return res.json() as Promise<TickPayload>;
  }
}