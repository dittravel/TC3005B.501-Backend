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

// XML data parsing
import { parseXmlData } from '../services/xmlParserService.js';
import { extractExternalData } from '../services/orgParserService.js';
import fs from 'fs/promises'; // For file handling in importData function


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
  try {
    const userData = req.body;
    await adminService.createUser(userData);
    return res.status(201).json({ message: 'User created succesfully'});
  } catch (error) {
    console.error('Error creating user:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Update existing user information
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.user_id;
    
    const result = await adminService.updateUserData(userId, req.body);
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('An error occurred updating the user:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
};

// Deactivate user account (soft delete)
export const deactivateUser = async (req, res) => {
  try {
    const user_id = parseInt(req.params.user_id);
    
    const user = await userModel.getUserData(user_id);
    if (!user) {
      return res.status(404).json({error: "User not found"});
    }
    
    const result = await Admin.deactivateUserById(user_id);
    
    return res.status(200).json({
      message: "User successfully deactivated",
      user_id: user_id,
      active: false
    });
  } catch (err) {
    console.error("Error in deactivateUser:", err);
    return res.status(500).json({
      error: "Unexpected error while deactivating user"
    });
  }
}

// Get list of all departments
export const getDepartments = async (req, res) => {
  try {
    const departments = await adminService.getDepartments();
    res.status(200).json(departments);
  } catch (error) {
    console.error('Error getting departments:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get list of all roles
export const getRoles = async (req, res) => {
  try {
    const roles = await adminService.getRoles();
    res.status(200).json(roles);
  } catch (error) {
    console.error('Error getting roles:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get list of all auth rules
export const getAuthRules = async (req, res) => {
  try {
    const rules = await adminService.getAuthRules();
    res.status(200).json(rules);
  } catch (error) {
    console.error('Error getting auth rules:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new auth rule
export const createAuthRule = async (req, res) => {
  try {
    const ruleData = req.body;
    await adminService.createAuthRule(ruleData);
    return res.status(201).json({ message: 'Authorization rule created successfully' });
  } catch (error) {
    console.error('Error creating auth rule:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an existing auth rule
export const updateAuthRule = async (req, res) => {
  try {
    const ruleId = req.params.rule_id;
    const result = await adminService.updateAuthRule(ruleId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error updating auth rule:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an auth rule
export const deleteAuthRule = async (req, res) => {
  try {
    const ruleId = req.params.rule_id;
    await adminService.deleteAuthRule(ruleId);
    return res.status(200).json({ message: 'Authorization rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting auth rule:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get list of bosses for a specific department
export const getBossList = async (req, res) => {
  try {
    const departmentId = req.params.department_id;
    const bosses = await adminService.getBossList(departmentId);
    res.status(200).json(bosses);
  } catch (error) {
    console.error('Error getting boss list:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Import data from XML file
export const importData = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No XML file uploaded' });
  }

  if (!req.file.buffer) {
    return res.status(400).json({ error: 'File buffer not available - upload failed' });
  }

  try {
    // Convert buffer to UTF-8 string
    const xmlContent = req.file.buffer.toString('utf-8');

    if (!xmlContent || xmlContent.trim() === '') {
      return res.status(400).json({ error: 'XML file is empty' });
    }

    const xmlData = await parseXmlData(xmlContent);
    const xmlObj = await extractExternalData(xmlData);

    // Process the extracted data and store it in the database
    const result = await adminService.createDataFromXml(xmlObj);

    res.status(200).json(result);
  }
  catch (error) {
    console.error('Error importing data from XML:', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export default {
  // Users
  getUserList,
  deactivateUser,
  createMultipleUsers,
  createUser,
  updateUser,
  // Departments
  getDepartments,
  // Roles
  getRoles,
  // Auth rules
  getAuthRules,
  createAuthRule,
  updateAuthRule,
  deleteAuthRule,
  // Departments
  getBossList,
  // Data import
  importData,
};
