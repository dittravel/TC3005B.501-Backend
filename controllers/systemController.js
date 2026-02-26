/**
 * System Controller
 *
 * Provides service-level endpoints used for operational checks.
 */

export function getHealth(req, res) {
  return res.status(501).json({
    error: "Not implemented",
  });
}

export function getVersion(req, res) {
  return res.status(501).json({
    error: "Not implemented",
  });
}
