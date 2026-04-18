/**
 * HTTP test server for E2E tests.
 * Starts the Express app on plain HTTP (no SSL) so tests run without certificates.
 * Used by playwright.config.js as the webServer command.
 */
import http from 'http';
import app from '../../app.js';

const PORT = parseInt(process.env.E2E_PORT || '3001', 10);

const server = http.createServer(app);

server.listen(PORT, () => {
  // Playwright's webServer waits for this exact output
  console.log(`E2E test server ready on http://localhost:${PORT}`);
});
