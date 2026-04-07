/**
 * Email service for sending travel request status notifications.
 * 
 * Uses Nodemailer to send formatted HTML emails to users when their
 * travel request status changes. Templates are loaded from separate HTML files.
 */

import 'dotenv/config.js';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUserById } from '../userService.js';
import User from '../../models/userModel.js';
import { generateToken } from './emailTokenService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL of the main page of the system
// Used in email to link back to the system
const BASE_URL = process.env.FRONTEND_URL;
const BACKEND_URL = process.env.BACKEND_URL;

// Set up the connection details for sending emails through gmail
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

// Templates directory where HTML email templates are stored
// path.join joins the current directory with 'templates'
// e.g. BASE_URL/templates/applicant.html
const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Get the email subject line based on user role and request status
 * @param {string} status - The current status of the travel request
 * @param {string} userRole - The role of the user receiving the email
 * @returns {string} The email subject line
 */
const getEmailSubject = (status, userRole) => {
  if (userRole === "Solicitante") {
    switch (status) {
      case "Revisión":
        return "Solicitud en revisión";
      case "Cotización del Viaje":
        return "Solicitud en cotización";
      case "Atención Agencia de Viajes":
        return "Solicitud en atención de agencia de viajes";
      case "Comprobación gastos del viaje":
        return "Sube tus comprobantes de gastos";
      case "Validación de comprobantes":
        return "Validación de tus comprobantes de gastos";
      case "Finalizado":
        return "Solicitud de viaje finalizada";
      case "Cancelado":
        return "Solicitud de viaje cancelada";
      case "Rechazado":
        return "Solicitud de viaje rechazada";
      default:
        return "Solicitud de viaje actualizada";
    }
  } else if (userRole === "Autorizador") {
    switch (status) {
      case "Revisión":
        return "Revisión requerida";
      default:
        return "Solicitud de viaje actualizada";
    }
  } else if (userRole === "Cuentas por pagar") {
    switch (status) {
      case "Cotización del Viaje":
        return "Cotización requerida";
      case "Comprobación gastos del viaje":
        return "Validación de comprobantes requerida";
      default:
        return "Solicitud de viaje actualizada";
    }
  } else if (userRole === "Agencia de viajes") {
    switch (status) {
      case "Atención Agencia de Viajes":
        return "Atención requerida";
      default:
        return "Solicitud de viaje actualizada";
    }
  }
  return "Solicitud de viaje actualizada";
}

/**
 * Send an email notification when a travel request status changes.
 * @param {string} userId - The ID of the user to send the email to
 * @param {number} requestId - The ID of the travel request
 * @returns {Promise<void>}
 * @throws {Error} If email fails to send
 */
export async function sendMail(userId, requestId) {
  // Get request details
  const requestDataRows = await User.getTravelRequestById(requestId);
  const requestData = requestDataRows[0];

  // Get user details
  const userData = await getUserById(userId);

  // Get current date in JSON format and slice to get only the date part (YYYY-MM-DD)
  const currentDate = new Date().toJSON().slice(0, 10);
  
  // Determine the email template to use based on the user's role and request status
  const status = requestData.request_status;
  const username = userData.user_name;
  const userRole = userData.role_name;  
  const email = userData.email;

  let templateName = "applicant.html"; // Default template
  
  if (userRole === "Solicitante") {
    if (status === "Comprobación gastos del viaje") {
      templateName = "applicant-receipts.html";
    } else {
      templateName = "applicant.html";
    }
  } else if (userRole === "Autorizador") {
    templateName = "authorizer.html";
  } else if (userRole === "Cuentas por pagar") {
    if (status === "Cotización del Viaje") {
      templateName = "accounts-payable-fee.html";
    } else {
      templateName = "accounts-payable-receipts.html";
    }
  } else if (userRole === "Agencia de viajes") {
    templateName = "travel-agent.html";
  }
  
  try {
    // Load the selected template
    const templatePath = path.join(TEMPLATES_DIR, templateName);
    let htmlContent = fs.readFileSync(templatePath, 'utf8');
    
    // Add CSS styles
    const stylesPath = path.join(TEMPLATES_DIR, 'styles.css');
    const cssContent = fs.readFileSync(stylesPath, 'utf8');

    // Replace the link tag with the actual CSS content wrapped in a style tag
    // This is done because the email service cant load external CSS files
    htmlContent = htmlContent.replace(
      /<link\s+rel="stylesheet"\s+href="\.\/styles\.css">/,
      `<style>${cssContent}</style>`
    );
    
    // Generate tokens for actions based on role and status
    // Only generate relevant tokens for each user role
    let tokens = {
      approveToken: null,
      declineToken: null,
      viewReceiptsToken: null,
      uploadReceiptsToken: null,
    };

    // Authorizer tokens
    if (userRole === "Autorizador") {
      tokens.approveToken = generateToken(requestId, userId, userRole, "approve");
      tokens.declineToken = generateToken(requestId, userId, userRole, "decline");
    }

    // Accounts Payable tokens (for viewing receipts)
    if (userRole === "Cuentas por pagar") {
      tokens.viewReceiptsToken = generateToken(requestId, userId, userRole, "view_receipts");
    }

    // Applicant token (for uploading receipts)
    if (userRole === "Solicitante") {
      tokens.uploadReceiptsToken = generateToken(requestId, userId, userRole, "upload_receipts");
    }
    
    // Replace placeholders in the template with values
    htmlContent = htmlContent
      .replace(/{{username}}/g, username)
      .replace(/{{requestId}}/g, requestId)
      .replace(/{{status}}/g, status)
      .replace(/{{currentDate}}/g, currentDate)
      .replace(/{{portalUrl}}/g, BASE_URL)
      .replace(/{{backendUrl}}/g, BACKEND_URL)
      .replace(/{{approveToken}}/g, tokens.approveToken || '')
      .replace(/{{declineToken}}/g, tokens.declineToken || '')
      .replace(/{{rejectToken}}/g, tokens.declineToken || '')
      .replace(/{{viewReceiptsToken}}/g, tokens.viewReceiptsToken || '')
      .replace(/{{uploadReceiptsToken}}/g, tokens.uploadReceiptsToken || '');
    
    const mailOptions = {
      from: `Portal de Viajes <${process.env.MAIL_USER}>`,
      to: email,
      subject: getEmailSubject(status, userRole),
      html: htmlContent,
    };
    
    await transporter.sendMail(mailOptions);
    
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
}

/**
 * Send a password reset email with a one-time recovery link.
 * @param {string} email - Decrypted recipient email address
 * @param {string} username - Username for personalisation
 * @param {string} token - Plaintext reset token (64-char hex)
 */
export async function sendPasswordResetEmail(email, username, token) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px;">
      <div style="max-width: 520px; margin: auto; background: #ffffff; border-radius: 8px; padding: 32px;">
        <h2 style="color: #1a1a2e;">Recuperación de contraseña</h2>
        <p>Hola <strong>${username}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón a continuación para continuar. Este enlace es válido por <strong>1 hora</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Restablecer contraseña
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Si no solicitaste este cambio puedes ignorar este correo. Tu contraseña no será modificada.</p>
        <p style="color: #666; font-size: 13px;">O copia y pega este enlace en tu navegador:<br>${resetUrl}</p>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `Portal de Viajes <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Recuperación de contraseña — Portal de Viajes',
    html: htmlContent,
  });
}

export default sendMail;