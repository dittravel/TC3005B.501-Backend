/**
 * System Controller
 *
 * Provides service-level endpoints used for operational checks.
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { name: serviceName, version } = require("../package.json");

function getSystemMetadata() {
  return {
    service: serviceName,
    version,
    timestamp: new Date().toISOString(),
  };
}

export function getHealth(req, res) {
  return res.status(200).json({
    status: "ok",
    uptime_seconds: Number(process.uptime().toFixed(2)),
    ...getSystemMetadata(),
  });
}

export function getVersion(req, res) {
  return res.status(200).json({
    ...getSystemMetadata(),
  });
}
