/**
 * Email Token Service
 * Generates and verifies tokens for email notifications
 */

import dotenv from "dotenv";
import jwt from 'jsonwebtoken';

dotenv.config();

// Token expiration time
const TOKEN_EXPIRATION = 48 * 60 * 60; // 48 hours

// Secret key for signing tokens
const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  throw new Error('JWT_SECRET environment variable is not set');
}

/**
 * Create a token according to the details of the request
 * @param {number} requestId - The ID of the travel request
 * @param {number} userId - The ID of the user
 * @param {string} role - The role of the user (e.g., 'Autorizador', 'Solicitante')
 * @param {string} action - The action for which the token is generated (e.g., 'approve', 'reject')
 * @returns {string} The generated JWT token
 */
const generateToken = (requestId, userId, role, action) => {
  const payload = {
    requestId,
    userId,
    role,
    action
  };
  return jwt.sign(payload, SECRET_KEY, { expiresIn: TOKEN_EXPIRATION });
};

/**
 * Verify the token and return the details of the request
 * @param {string} token - The JWT token to verify
 * @returns {Object} The decoded token payload containing requestId, userId, role, and action
 * @returns {null} If token verification fails
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export { generateToken, verifyToken };