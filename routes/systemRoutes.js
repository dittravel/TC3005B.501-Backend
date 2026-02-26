/**
 * System Routes
 *
 * Public operational endpoints for service status and version metadata.
 */

import express from "express";
import * as systemController from "../controllers/systemController.js";

const router = express.Router();

router.route("/health")
  .get(systemController.getHealth);

router.route("/version")
  .get(systemController.getVersion);

export default router;
