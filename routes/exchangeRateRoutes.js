/**
 * Exchange Rate Routes
 *
 * Defines all endpoints for querying exchange rates from Banxico.
 * Mounted at /api/exchange-rate in index.js.
 *
 * GET  /api/exchange-rate/catalog       — list all supported currencies
 * GET  /api/exchange-rate/search?q=...  — search Banxico full catalog
 * GET  /api/exchange-rate?series=...    — get current rate (defaults to USD/MXN)
 * POST /api/exchange-rate/clear-cache   — flush in-memory rate cache
 */

import express from 'express';
import * as exchangeRateController from '../controllers/exchangeRateController.js';
import { generalRateLimiter } from "../middleware/rateLimiters.js";
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/catalog', generalRateLimiter, exchangeRateController.getCatalog);
router.get('/', generalRateLimiter, exchangeRateController.getCurrentExchangeRate);
router.post('/clear-cache', generalRateLimiter, authenticateToken, exchangeRateController.clearCache);

export default router;
