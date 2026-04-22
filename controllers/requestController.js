/**
 * Request Controller
 *
 * HTTP handlers for requests
 */

import RequestService from '../services/requestService.js';

export const getUserRequests = async (req, res) => {
  const userId = Number(req.params.user_id);
  const societyId = Number(req.user.society_id);
  const { status, sort = 'desc' } = req.query;

  try {
    const requests = await RequestService.getUserRequests(userId, societyId, { status, sort });
    return res.status(200).json(requests);
  } catch (err) {
    console.error('Error in getUserRequests controller:', err);
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
