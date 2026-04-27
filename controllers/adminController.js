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

// Data parsing (JSON)
import { extractExternalDataFromJSON } from '../services/orgParserService.js';

/**
* Get list of all users
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @returns {Object} JSON response with user list
*/
export const getUserList = async (req, res) => {
  try {
    // Admin data should be scoped to the requester's society by default.
    const filterBy = { society_id: req.user.society_id };
    const users = await adminService.getUserList(filterBy);
    if (!users) {
      return res.status(404).json({error: "No users found"});
    }
    const formattedUsers = users.map(user => ({
      user_id: user.user_id,
      user_name: user.user_name,
      email: user.email,
      role_name: user.role_name,
      department_name: user.department_name,
      cost_center_name: user.cost_center_name,
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
    const result = await adminService.parseCSV(filePath, false, { actor: req.user });
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
    const createdUser = await adminService.createUser(userData, { actor: req.user });
    try {
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'USER_CREATED',
        entityType: 'User',
        entityId: createdUser.user_id,
        metadata: {
          user_name: createdUser.user_name,
          role_id: createdUser.role_id,
          department_id: createdUser.department_id,
        },
      });
    } catch (auditError) {
      console.error('Audit log failed for USER_CREATED:', auditError.message);
    }

    return res.status(201).json({ message: 'User created succesfully'});
  } catch (error) {
    console.error('Error creating user:', error.message);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

// Update existing user information
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.user_id;
    const result = await adminService.updateUserData(userId, req.body, { actor: req.user });
    if (result.updated_fields) {
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'USER_UPDATED',
        entityType: 'User',
        entityId: userId,
        metadata: {
          updated_fields: result.updated_fields,
        },
      });
    }
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('An error occurred updating the user:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
};

// Deactivate user account (soft delete)
export const deactivateUser = async (req, res) => {
  try {
    const user_id = Number.parseInt(req.params.user_id, 10);
    
    const user = await userModel.getUserData(user_id);
    if (!user) {
      return res.status(404).json({error: "User not found"});
    }
    
    const result = await Admin.deactivateUserById(user_id);
    if (result) {
      await AuditLogService.recordAuditLogFromRequest(req, {
        actionType: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: user_id,
        metadata: {
          active: false,
        },
      });
    }
    
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
    const departments = await adminService.getDepartments(req.user.society_group_id, req.user.society_id);
    res.status(200).json(departments);
  } catch (error) {
    console.error('Error getting departments:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get list of all roles
export const getRoles = async (req, res) => {
  try {
    const roles = await adminService.getRoles(req.user.society_group_id, req.user.society_id, req.user);
    res.status(200).json(roles);
  } catch (error) {
    console.error('Error getting roles:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get role details by role ID
export const getRoleById = async (req, res) => {
  try {
    const roleId = req.params.role_id;
    const role = await adminService.getRoleById(roleId, req.user.society_group_id, req.user.society_id, req.user);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.status(200).json(role);
  } catch (error) {
    console.error('Error getting role by ID:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new role
export const createRole = async (req, res) => {
  try {
    const role = await adminService.createRole(req.body, req.user.society_group_id, req.user.society_id, req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'ROLE_CREATED',
      entityType: 'Role',
      entityId: role.role_id,
      metadata: {
        role_name: role.role_name,
      },
    });
    return res.status(201).json({ success: true, role_id: role.role_id });
  } catch (error) {
    console.error('Error creating role:', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const roleId = req.params.role_id;
    const updated = await adminService.updateRole(roleId, req.body, req.user.society_group_id, req.user.society_id, req.user);
    if (!updated) {
      return res.status(404).json({ error: 'Role not found' });
    }
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'ROLE_UPDATED',
      entityType: 'Role',
      entityId: roleId,
      metadata: {
        role_name: req.body.name,
      },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating role:', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Get default role for current society group
export const getDefaultRole = async (req, res) => {
  try {
    const role = await adminService.getDefaultRole(req.user.society_group_id, req.user.society_id, req.user);
    return res.status(200).json(role);
  } catch (error) {
    console.error('Error getting default role:', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Set default role for current society group
export const setDefaultRole = async (req, res) => {
  try {
    const roleId = req.params.role_id;
    if (!roleId) {
      return res.status(400).json({ error: 'role_id is required' });
    }

    const updated = await adminService.setDefaultRole(roleId, req.user.society_group_id, req.user.society_id, req.user);
    if (!updated) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = await adminService.getDefaultRole(req.user.society_group_id, req.user.society_id, req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'ROLE_DEFAULT_UPDATED',
      entityType: 'Role',
      entityId: roleId,
      metadata: {
        default_role_id: role?.role_id || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Default role updated successfully',
      role,
    });
  } catch (error) {
    console.error('Error setting default role:', error.message);
    if (error.message?.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const roleId = req.params.role_id;
    const deleted = await adminService.deleteRole(roleId, req.user.society_group_id, req.user.society_id, req.user);
    if (!deleted) {
      return res.status(404).json({ error: 'Role not found' });
    }
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'ROLE_DELETED',
      entityType: 'Role',
      entityId: roleId,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error.message);
    return res.status(400).json({ error: error.message || 'Internal server error' });
  }
};

// Get master superadmins (limited control surface for superadmin users)
export const getMasterAdmins = async (req, res) => {
  try {
    const admins = await adminService.getMasterAdmins(req.user);
    return res.status(200).json(admins);
  } catch (error) {
    console.error('Error getting master admins:', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Create a new master superadmin.
export const createMasterAdmin = async (req, res) => {
  try {
    const created = await adminService.createMasterAdmin(req.body, req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'MASTER_ADMIN_CREATED',
      entityType: 'User',
      entityId: created.user_id,
      metadata: {
        user_name: created.user_name,
        role: 'Superadministrador',
      },
    });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating master admin:', error.message);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
};

// Get an auth rule by ID
export const getAuthRuleById = async (req, res) => {
  try {
    const ruleId = req.params.rule_id;
    const rule = await adminService.getAuthRuleById(ruleId, req.user.society_group_id, req.user.society_id);
    if (!rule) {
      return res.status(404).json({ error: 'Authorization rule not found' });
    }
    res.status(200).json(rule);
  } catch (error) {
    console.error('Error getting auth rule by ID:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get list of all auth rules
export const getAuthRules = async (req, res) => {
  try {
    const rules = await adminService.getAuthRules(req.user.society_group_id, req.user.society_id);
    console.log('Retrieved auth rules:', rules);
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
    await adminService.createAuthRule(ruleData, req.user.society_group_id, req.user.society_id);
    return res.status(201).json({ success: true, message: 'Authorization rule created successfully' });
  } catch (error) {
    console.error('Error creating auth rule:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an existing auth rule
export const updateAuthRule = async (req, res) => {
  try {
    const ruleId = req.params.rule_id;
    const result = await adminService.updateAuthRule(ruleId, req.body, req.user.society_group_id, req.user.society_id);
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
    await adminService.deleteAuthRule(ruleId, req.user.society_group_id, req.user.society_id);
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
    const bosses = await adminService.getBossList(
      departmentId,
      req.user.society_group_id,
      req.user.society_id,
    );
    res.status(200).json(bosses);
  } catch (error) {
    console.error('Error getting boss list:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Import data from JSON file
export const importData = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No JSON file uploaded' });
  }

  if (!req.file.buffer) {
    return res.status(400).json({ error: 'File buffer not available - upload failed' });
  }

  // Verify that admin has a society_group_id
  if (!req.user.society_group_id) {
    return res.status(403).json({ error: 'User does not have a valid society group assigned' });
  }

  try {
    const fileContent = req.file.buffer.toString('utf-8');

    if (!fileContent || fileContent.trim() === '') {
      return res.status(400).json({ error: 'File is empty' });
    }

    // Parse as JSON
    let jsonObj;
    try {
      jsonObj = JSON.parse(fileContent);
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON format: ' + parseError.message });
    }

    // Extract data from JSON with admin's society_group_id
    const extractedData = extractExternalDataFromJSON(
      jsonObj,
      req.user.society_group_id
    );

    // Check if there were parsing errors
    if (extractedData.errors && extractedData.errors.length > 0) {
      return res.status(400).json({
        error: 'Data contains parsing errors',
        errors: extractedData.errors
      });
    }

    // Process the extracted data and store it in the database
    const result = await adminService.createDataFromJson(extractedData);

    res.status(200).json(result);
  }
  catch (error) {
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
  getRoleById,
  createRole,
  updateRole,
  getDefaultRole,
  setDefaultRole,
  deleteRole,
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
