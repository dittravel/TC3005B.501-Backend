/**
* Admin Controller
* 
* This module handles system administration functions and business logic
* for the "Administrador" role. It provides functionality for user management,
* administrative oversight, and bulk operations such as CSV file processing.
* 
* All functions require proper authentication and authorization to ensure
* only administrators can access these sensitive operations.
*/

import * as adminService from "../services/adminService.js";
import Admin from "../models/adminModel.js";
import userModel from "../models/userModel.js";
import AuditLogService from "../services/auditLogService.js";
import pool from "../database/config/db.js";

/**
* Get list of all users
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Object} JSON response with user list
*/
export const getUserList = async (req, res) => {
  try {
    const users = await adminService.getUserList();
    if (!users) {
      return res.status(404).json({error: "No users found"});
    }
    const formattedUsers = users.map(user => ({
      user_id: user.user_id,
      user_name: user.user_name,
      email: user.email,
      role_name: user.role_name,
      department_name: user.department_name,
      phone_number: user.phone_number,
    }));
    res.status(200).json(formattedUsers);
  } catch(error) {
    console.error('Error getting user list:', error.message);
    return res.status(500).json({ error: 'Internal server error'});
  }
}

// Create multiple users from CSV file upload
export const createMultipleUsers = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }
  
  const filePath = req.file.path;
  
  try {
    const result = await adminService.parseCSV(filePath, false);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
* Create a new user (admin functionality)
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Object} JSON response with created user data
*/
export const createUser = async (req, res) => {
  let connection;
  try {
    const userData = req.body;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const createdUser = await adminService.createUser(userData, { connection });
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'USER_CREATED',
      entityType: 'User',
      entityId: createdUser.user_id,
      metadata: {
        user_name: createdUser.user_name,
        role_id: createdUser.role_id,
        department_id: createdUser.department_id,
      },
    }, { connection });
    await connection.commit();
    return res.status(201).json({ message: 'User created succesfully'});
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error creating user:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
}

// Update existing user information
export const updateUser = async (req, res) => {
  let connection;
  try {
    const userId = req.params.user_id;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const result = await adminService.updateUserData(userId, req.body, { connection });
    if (result.updated_fields) {
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'USER_UPDATED',
        entityType: 'User',
        entityId: userId,
        metadata: {
          updated_fields: result.updated_fields,
        },
      }, { connection });
    }
    await connection.commit();
    return res.status(200).json(result);
    
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('An error occurred updating the user:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
};

// Deactivate user account (soft delete)
export const deactivateUser = async (req, res) => {
  let connection;
  try {
    const user_id = parseInt(req.params.user_id);
    
    const user = await userModel.getUserData(user_id);
    if (!user) {
      return res.status(404).json({error: "User not found"});
    }
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const result = await Admin.deactivateUserById(user_id, connection);
    if (result) {
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: user_id,
        metadata: {
          active: false,
        },
      }, { connection });
    }
    await connection.commit();
    
    return res.status(200).json({
      message: "User successfully deactivated",
      user_id: user_id,
      active: false
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Error in deactivateUser:", err);
    return res.status(500).json({
      error: "Unexpected error while deactivating user"
    });
  } finally {
    if (connection) connection.release();
  }
}

export default {
  getUserList,
  deactivateUser,
  createMultipleUsers,
  createUser,
  updateUser
};
