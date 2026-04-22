/**
 * Graph.tsx
 *
 * Replacement for the Perspective-based Graph component.
 *
 * Original (Graph.tsx with @jpmorganchase/perspective v0.2.12):
 *   - Rendered a <perspective-viewer> web component
 *   - Used elem.setAttribute() to configure view/pivots/columns
 *   - Showed top_ask_price for ABC over time (Task 2)
 *   - Task 3 required patching to show ratio + bounds + alert lines
 *
 * Refactor (Recharts 2 + React 18):
 *   - Goal A fix: deduplication handled upstream in useSSEFeed
 *   - Goal B fix: continuous data feed via SSE (no polling)
 *   - Goal C / Task 3:
 *       • Y-axis: ratio (ABC ask / DEF ask)
 *       • Upper bound line  (rolling avg × 1.10)
 *       • Lower bound line  (rolling avg × 0.90)
 *       • Red alert dots/segments when ratio crosses bounds
 */

import React, { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Dot,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RatioRow } from './DataStreamer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  ratioHistory: RatioRow[];
  tickCount: number;   // used as a render key so chart refreshes live
}

// How many points to render (keeps the DOM lightweight)
const DISPLAY_POINTS = 200;

// ---------------------------------------------------------------------------
// Custom components
// ---------------------------------------------------------------------------

// Red dot rendered on alert crossings
const AlertDot = (props: {
  cx?: number;
  cy?: number;
  payload?: RatioRow;
}) => {
  const { cx, cy, payload } = props;
  if (!payload?.trigger_alert || cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={4} fill="#e63946" stroke="#fff" strokeWidth={1} />;
};

// Custom tooltip
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      fontFamily: "'JetBrains Mono', monospace",
      color: '#e6edf3',
    }}>
      <p style={{ margin: '0 0 4px', color: '#8b949e', fontSize: 11 }}>
        {label ? new Date(label).toLocaleTimeString() : ''}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: {p.value.toFixed(6)}
        </p>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Graph component
// ---------------------------------------------------------------------------

const Graph: React.FC<Props> = ({ ratioHistory }) => {
  // Slice to most recent DISPLAY_POINTS — avoids rendering thousands of SVG nodes
  const data = useMemo(
    () => ratioHistory.slice(-DISPLAY_POINTS),
    [ratioHistory]
  );

  // Find any alert crossings for reference lines (vertical red bands)
  const alertTimestamps = useMemo(
    () => data.filter((r) => r.trigger_alert).map((r) => r.timestamp),
    [data]
  );

  if (data.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>◎</span>
        <p>Waiting for data stream…</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>ABC / DEF ratio — live</span>
        <span style={styles.points}>{data.length} pts</span>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />

          <XAxis
            dataKey="timestamp"
            tickFormatter={(v: string) => new Date(v).toLocaleTimeString()}
            tick={{ fontSize: 10, fill: '#8b949e', fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#30363d' }}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: '#8b949e', fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#30363d' }}
            tickFormatter={(v: number) => v.toFixed(4)}
            width={64}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: 12, color: '#8b949e', paddingTop: 8 }}
          />

          {/* --- Alert vertical reference lines (Task 3 — red lines) --- */}
          {alertTimestamps.map((ts) => (
            <ReferenceLine
              key={ts}
              x={ts}
              stroke="#e63946"
              strokeOpacity={0.35}
              strokeWidth={1}
            />
          ))}

          {/* --- Upper bound (Task 3) --- */}
          <Line
            type="monotone"
            dataKey="upper_bound"
            name="upper bound"
            stroke="#f0b429"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
          />

          {/* --- Lower bound (Task 3) --- */}
          <Line
            type="monotone"
            dataKey="lower_bound"
            name="lower bound"
            stroke="#f0b429"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
          />

          {/* --- Ratio line (Task 3 — replaces top_ask_price) --- */}
          <Line
            type="monotone"
            dataKey="ratio"
            name="ABC/DEF ratio"
            stroke="#58a6ff"
            strokeWidth={2}
            dot={(props) => <AlertDot {...props} />}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div style={styles.legend}>
        <span style={{ ...styles.legendItem, color: '#58a6ff' }}>● ratio</span>
        <span style={{ ...styles.legendItem, color: '#f0b429' }}>- - bounds (±10%)</span>
        <span style={{ ...styles.legendItem, color: '#e63946' }}>| alerts</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '16px 8px 8px',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e6edf3',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  points: {
    fontSize: 11,
    color: '#8b949e',
    fontFamily: 'monospace',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 340,
    color: '#8b949e',
    fontSize: 14,
    gap: 8,
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
  },
  emptyIcon: {
    fontSize: 32,
    opacity: 0.4,
  },
  legend: {
    display: 'flex',
    gap: 20,
    paddingLeft: 16,
    paddingTop: 8,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  legendItem: {
    display: 'inline-block',
  },
};

export default Graph;