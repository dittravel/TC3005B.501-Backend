/**
 * User Service
 * 
 * This service contains the business logic for handling
 * user-related operations, such as fetching user data and
 * authenticating users.
 */

import userModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { decrypt } from '../middleware/decryption.js';
import { sendPasswordResetEmail } from './email/mail.js';

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User data
 */
export async function getUserById(userId) {
  try {
    const userData = await userModel.getUserData(userId);

    const decryptedEmail = decrypt(userData.email);
    const decryptedPhone = decrypt(userData.phone_number);

    const user = {
      user_id: userData.user_id,
      user_name: userData.user_name,
      email: decryptedEmail,
      phone_number: decryptedPhone,
      workstation: userData.workstation,
      department_name: userData.department_name,
      cost_center_name: userData.cost_center_name,
      costs_center: userData.cost_center_name,
      creation_date: userData.creation_date,
      role_id: userData.role_id,
      role_name: userData.role_name,
      boss_id: userData.boss_id,
      boss_name: userData.boss_name || 'N/A',
      society_id: userData.society_id,
      out_of_office_start_date: userData.out_of_office_start_date,
      out_of_office_end_date: userData.out_of_office_end_date,
      substitute_id: userData.substitute_id,
      substitute_name: userData.substitute_name || 'N/A'
    };
    return user;
  } catch (error) {
    throw new Error(`Error fetching user with ID ${userId}: ${error.message}`);
  }
}

/**
 * Authenticate user and generate JWT
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} - Authenticated user data and token
 */
export async function authenticateUser(username, password, req) {
  try {
    const user = await userModel.getUserUsername(username);
    
    if (!user || user.length === 0) {
      throw new Error("Invalid username or password");
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid username or password");
    }

    if (!user.active) {
      throw new Error("User acccount is inactive")
    }

    const enforceIpBinding = String(process.env.ENFORCE_TOKEN_IP_BINDING || 'false').toLowerCase() === 'true';
    const tokenPayload = {
      user_id: user.user_id,
      role: user.role_name,
      role_id: user.role_id,
      permissions: user.permission_keys || [],
      society_id: user.society_id,
      society_group_id: user.society_group_id,
      ...(enforceIpBinding ? { ip: req.ip } : {}),
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return {
      token,
      role: user.role_name,
      username: user.user_name,
      user_id: user.user_id,
      department_id: user.department_id,
      society_id: user.society_id,
      society_group_id: user.society_group_id,
      permissions: user.permissions || [],
      permission_keys: user.permission_keys || []
    };
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Update out-of-office information for a user
 * @param {number} userId - User ID
 * @param {Object} data - Out-of-office data (out_of_office_start_date, out_of_office_end_date, substitute_id)
 * @returns {Promise<Object>} - Success message and updated fields
 */
export async function updateOutOfOffice(userId, data) {
  try {
    const fieldsToUpdate = {};
    const updatedFields = [];

    // Validate and prepare out_of_office_start_date
    if (data.hasOwnProperty('out_of_office_start_date')) {
      fieldsToUpdate.out_of_office_start_date = data.out_of_office_start_date || null;
      updatedFields.push('out_of_office_start_date');
    }

    // Validate and prepare out_of_office_end_date
    if (data.hasOwnProperty('out_of_office_end_date')) {
      fieldsToUpdate.out_of_office_end_date = data.out_of_office_end_date || null;
      updatedFields.push('out_of_office_end_date');
    }

    // Date validation: if both dates are provided, start must be <= end
    if (fieldsToUpdate.out_of_office_start_date && fieldsToUpdate.out_of_office_end_date) {
      if (fieldsToUpdate.out_of_office_start_date > fieldsToUpdate.out_of_office_end_date) {
        throw new Error('Out-of-office start date must be before or equal to end date');
      }
    }

    // Validate and prepare substitute_id
    if (data.hasOwnProperty('substitute_id')) {
      if (data.substitute_id !== null && data.substitute_id !== undefined) {
        // Verify substitute is in the same department
        const departmentMembers = await userModel.getUserDepartmentMembers(userId);
        const substituteIds = departmentMembers.map(m => m.user_id);

        if (!substituteIds.includes(data.substitute_id)) {
          throw new Error('Substitute must be from the same department');
        }
      }
      fieldsToUpdate.substitute_id = data.substitute_id || null;
      updatedFields.push('substitute_id');
    }

    // If no valid fields provided, return early
    if (Object.keys(fieldsToUpdate).length === 0) {
      return {
        message: 'No valid fields to update',
        updated_fields: []
      };
    }

    // Update in database
    await userModel.updateOutOfOffice(userId, fieldsToUpdate);

    return {
      message: 'Out-of-office updated successfully',
      updated_fields: updatedFields
    };
  } catch (error) {
    throw new Error(`Error updating out-of-office: ${error.message}`);
  }
}

/**
 * Issue a password reset token and send a recovery email.
 * Always resolves without error to avoid user enumeration.
 * @param {string} username
 */
export async function requestPasswordReset(email) {
  const user = await userModel.getUserByEmail(email);

  // Bail silently if user not found — don't leak whether email is registered
  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await userModel.setPasswordResetToken(user.user_id, token, expires);
  await sendPasswordResetEmail(email, user.user_name, token);
}

/**
 * Validate a reset token and update the user's password.
 * @param {string} token - Plaintext reset token from the email link
 * @param {string} newPassword - New plaintext password
 */
export async function resetPassword(token, newPassword) {
  const user = await userModel.getUserByResetToken(token);
  if (!user) {
    const err = new Error('Invalid or expired password reset token');
    err.status = 400;
    throw err;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await userModel.updatePassword(user.user_id, hashed);
  await userModel.clearPasswordResetToken(user.user_id);
}

// Export default object with all service functions
export default {
  getUserById,
  updateOutOfOffice
};  
