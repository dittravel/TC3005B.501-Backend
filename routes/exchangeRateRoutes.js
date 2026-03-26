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

const router = express.Router();

router.get('/catalog', exchangeRateController.getCatalog);
router.get('/search', exchangeRateController.searchSeries);
router.get('/', exchangeRateController.getCurrentExchangeRate);
router.post('/clear-cache', exchangeRateController.clearCache);

export default router;
