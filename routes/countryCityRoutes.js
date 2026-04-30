/**
 * Country City Routes
 *
 * Defines endpoints for querying the country and city catalogs.
 * Mounted at /api in index.js.
 *
 * GET /api/countries          — list all countries
 * GET /api/cities?countryId=  — list cities filtered by country
 */

import express from "express";
import * as countryCityController from "../controllers/countryCityController.js";

const router = express.Router();

router.route("/countries")
  .get(countryCityController.getCountries);

router.route("/cities")
  .get(countryCityController.getCitiesByCountry);

export default router;
