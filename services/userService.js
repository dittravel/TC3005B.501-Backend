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
import { decrypt } from '../middleware/decryption.js';

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
      role_name: userData.role_name,
      boss_id: userData.boss_id,
      boss_name: userData.boss_name || 'N/A',
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

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role_name, ip: req.ip },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    return {
      token,
      role: user.role_name,
      username: user.user_name,
      user_id: user.user_id,
      department_id: user.department_id 
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

// Export default object with all service functions
export default {
  getUserById,
  updateOutOfOffice
};  
