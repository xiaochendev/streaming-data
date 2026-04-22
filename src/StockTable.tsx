/**
 * StockTable.tsx
 *
 * Replaces the Perspective table view (Goal A fix visualised).
 *
 * Original bug: every click of "Start Streaming" re-added ALL historical
 * rows to the Perspective table because setState replaced the whole array
 * and table.update() was called with duplicates.
 *
 * This component receives the de-duplicated stockMap (Map<stock, latest row>)
 * from the parent, so each stock always shows exactly one live row.
 */

import React from 'react';
import type { ServerRespond } from './DataStreamer';

interface Props {
  stockMap: Map<string, ServerRespond>;
}

const StockTable: React.FC<Props> = ({ stockMap }) => {
  const rows = Array.from(stockMap.values());

  return (
    <div style={styles.wrapper}>
      <div style={styles.tableTitle}>live tick feed</div>
      <table style={styles.table}>
        <thead>
          <tr>
            {['stock', 'ask price', 'ask size', 'bid price', 'bid size', 'timestamp'].map(
              (h) => (
                <th key={h} style={styles.th}>
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#8b949e' }}>
                — no data —
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.stock} style={styles.tr}>
                <td style={{ ...styles.td, ...styles.stockCell }}>{row.stock}</td>
                <td style={{ ...styles.td, ...styles.numCell, color: '#58a6ff' }}>
                  {row.top_ask.price.toFixed(2)}
                </td>
                <td style={{ ...styles.td, ...styles.numCell }}>
                  {row.top_ask.size.toLocaleString()}
                </td>
                <td style={{ ...styles.td, ...styles.numCell, color: '#3fb950' }}>
                  {row.top_bid.price.toFixed(2)}
                </td>
                <td style={{ ...styles.td, ...styles.numCell }}>
                  {row.top_bid.size.toLocaleString()}
                </td>
                <td style={{ ...styles.td, color: '#8b949e', fontSize: 11 }}>
                  {new Date(row.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableTitle: {
    padding: '10px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: '#8b949e',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid #21262d',
    background: '#161b22',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 13,
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    color: '#8b949e',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid #21262d',
    background: '#161b22',
  },
  tr: {
    borderBottom: '1px solid #21262d',
  },
  td: {
    padding: '10px 12px',
    color: '#e6edf3',
    verticalAlign: 'middle' as const,
  },
  stockCell: {
    fontWeight: 700,
    color: '#f0b429',
    letterSpacing: '0.05em',
  },
  numCell: {
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
};

export default StockTable;