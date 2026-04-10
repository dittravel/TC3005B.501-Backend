/**
* Email service for sending notifications about travel request status changes
*/

import mailData from './mailData.js';
import { sendMail } from './mail.js';
import RequestService from '../requestService.js';

export async function sendEmails(requestId) {
  // Get users who will receive email notifications
  const { applicantId, assignedToId } = await mailData(requestId);
  
  // Get current request status
  const status = await RequestService.getRequestStatusName(requestId);
  
  // Final states to only send to applicant
  const finalStates = ['Finalizado', 'Cancelado', 'Rechazado'];
  
  if (finalStates.includes(status)) {
    // Only send to applicant for final states
    await sendMail(applicantId, requestId);
  } else if (applicantId === assignedToId || !assignedToId) {
    // Only send one email if applicant and assigned_to are the same person or assigned_to is null
    await sendMail(applicantId, requestId);
  } else {
    // Send to both applicant and assigned_to user (if assignedToId exists)
    await sendMail(applicantId, requestId);
    if (assignedToId) {
      await sendMail(assignedToId, requestId);
    }
  }
}

export default sendEmails;