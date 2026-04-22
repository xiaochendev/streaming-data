/**
 * App.tsx
 *
 * React 18 functional component.
 *
 * Original (React 16 class component):
 *   - class App extends Component<{}, IState>
 *   - getDataFromServer() used setInterval + XHR
 *   - showGraph boolean controlled render
 *   - "Start Streaming Data" button had to be clicked each time
 *   - Bugs: duplicate rows, no cleanup, no ratio chart
 *
 * Refactor (React 18 functional component):
 *   - Functional component + hooks
 *   - useSSEFeed hook manages SSE lifecycle (Goal B fix)
 *   - De-duplication handled in hook (Goal A fix)
 *   - Graph shows ratio + bounds + alerts (Goal C / Task 3)
 *   - Toggle button: Start / Stop streaming
 *   - Dark terminal aesthetic matching a trading floor UI
 */

import React from 'react';
import Graph from './Graph';
import StockTable from './StockTable';
import { useSSEFeed } from './UseSSEFeed';
import './App.css';

const App: React.FC = () => {
  const [state, actions] = useSSEFeed();
  const { stockMap, ratioHistory, isStreaming, tickCount, error } = state;

  // Derived stats
  const latestRatio = ratioHistory.at(-1);
  const alertCount = ratioHistory.filter((r) => r.trigger_alert).length;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-left">
          <span className="brand">Bank &amp; co.</span>
          <span className="subtitle">trader dashboard </span>
        </div>
        <div className="header-right">
          <span className={`status-badge ${isStreaming ? 'status-live' : 'status-idle'}`}>
            <span className="status-dot" />
            {isStreaming ? 'live' : 'idle'}
          </span>
        </div>
      </header>

      {/* ── Controls ── */}
      <div className="controls-bar">
        <button
          className={`stream-btn ${isStreaming ? 'stream-btn--stop' : 'stream-btn--start'}`}
          onClick={isStreaming ? actions.stopStreaming : actions.startStreaming}
        >
          {isStreaming ? '⏹ stop streaming' : '▶ start streaming data'}
        </button>

        <div className="stat-pills">
          <span className="pill">ticks: <strong>{tickCount.toLocaleString()}</strong></span>
          <span className="pill">
            ratio:{' '}
            <strong style={{ color: latestRatio?.trigger_alert ? '#e63946' : '#58a6ff' }}>
              {latestRatio ? latestRatio.ratio.toFixed(5) : '—'}
            </strong>
          </span>
          <span className="pill alerts">
            alerts: <strong style={{ color: alertCount > 0 ? '#e63946' : '#8b949e' }}>{alertCount}</strong>
          </span>
        </div>

        {error && <span className="error-badge">{error}</span>}
      </div>

      {/* ── Main content ── */}
      <main className="app-main">
        {/* Ratio chart — Goal C / Task 3 */}
        <section className="section">
          <Graph ratioHistory={ratioHistory} tickCount={tickCount} />
        </section>

        {/* Live stock table — Goal A fix (no duplicates) */}
        <section className="section">
          <StockTable stockMap={stockMap} />
        </section>

        {/* Ratio stats panel */}
        {latestRatio && (
          <section className="stats-grid">
            <StatCard label="ratio" value={latestRatio.ratio.toFixed(6)} color="#58a6ff" />
            <StatCard label="upper bound" value={latestRatio.upper_bound.toFixed(6)} color="#f0b429" />
            <StatCard label="lower bound" value={latestRatio.lower_bound.toFixed(6)} color="#f0b429" />
            <StatCard
              label="alert"
              value={latestRatio.trigger_alert ? 'TRIGGERED' : 'normal'}
              color={latestRatio.trigger_alert ? '#e63946' : '#3fb950'}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <span>Refactor: React 18 · Vite 5 · TypeScript 5 · Recharts 2 · FastAPI SSE</span>
        <span>original: React 16 · CRA · TS 3 · Perspective 0.2 · XHR polling</span>
      </footer>
    </div>
  );
};

// Small stat card component
interface StatCardProps {
  label: string;
  value: string;
  color: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value" style={{ color }}>{value}</div>
  </div>
);

export default App;