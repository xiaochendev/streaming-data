/**
 * main.tsx
 *
 * React 18 entry point.
 * Original used: ReactDOM.render(<App />, document.getElementById('root'))
 * Refactor uses: createRoot().render() — concurrent mode, StrictMode
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);