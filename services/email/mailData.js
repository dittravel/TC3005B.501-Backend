/**
 * Fetches mail details for a travel request to send notification emails.
 * Returns data for both the applicant and the assigned_to user.
 */

import { prisma } from "../../lib/prisma.js";

/**
 * Fetch mail details for a travel request to send notification emails.
 * @param {number} requestId - The ID of the travel request
 * @returns {Promise<Object>} Object containing applicant and assigned_to user data
 * @throws {Error} If database query fails
 */
const getMailDetails = async (requestId) => {
  const request = await prisma.request.findUnique({
    where: { request_id: Number(requestId) },
    select: {
      user_id: true,
      assigned_to: true,
    },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  return {
    applicantId: request.user_id,
    assignedToId: request.assigned_to,
  };
};

export default getMailDetails;