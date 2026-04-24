/**
 * Admin service for user management and CSV processing
 * 
 * This service provides functionalities for creating users,
 * fetching user lists, updating user data,
 * and processing bulk user creation from CSV files.
 * 
 * It includes encryption for sensitive data and validation
 * to ensure data integrity.
 */

import Admin from "../models/adminModel.js";
import User from "../models/userModel.js";
import Society from "../models/societyModel.js";
import crypto from 'crypto';
import bcrypt from 'bcrypt';
const AES_SECRET_KEY = process.env.AES_SECRET_KEY;
const AES_IV = process.env.AES_IV;
import { parse } from 'csv-parse';
import fs, { unlink } from 'fs';
import { decrypt } from '../middleware/decryption.js';

// Required columns for CSV validation
const requiredColumns = ['role_name', 'department_name', 'user_name', 'password', 'workstation', 'email'];

// Encryption function for sensitive data
const encrypt = (data) => {
  const IV = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), IV);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return IV.toString('hex') + encrypted;
}

// Hashing function for passwords
const hash = async (data) => {
  return await bcrypt.hash(data, 10);
}

/**
 * Create a new user (admin functionality)
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user data
 */
export async function createUser(userData, options = {}) {
  try {
    const hashedPassword = await hash(userData.password);

    const allEmails = await Admin.getAllEmails();

    const emailExists = allEmails.some(email => {
    const encryptedEmailString = email.email;

    const existingDecryptedEmail = decrypt(encryptedEmailString);

    const matchFound = existingDecryptedEmail === userData.email;
    return matchFound;
  });

  if (emailExists) {
    throw { status: 400, message: 'Email already in use by another user' };
  }
  
    const encryptedEmail = encrypt(userData.email);
    const encryptedPhone = encrypt(userData.phone_number);

    const newUser = {
      role_id: userData.role_id,
      department_id: userData.department_id,
      society_id: userData.society_id,
      user_name: userData.user_name,
      password: hashedPassword,
      workstation: userData.workstation,
      email: encryptedEmail,
      phone_number: encryptedPhone,
      boss_id: userData.boss_id || null
    };

    const createdUser = await Admin.createUser(newUser, options.connection);

    return {
      user_id: createdUser.user_id,
      role_id: newUser.role_id,
      department_id: newUser.department_id,
      user_name: newUser.user_name,
    };
  } catch (error) {
    if (error?.status) {
      throw error;
    }

    const wrappedError = new Error(`Error creating user: ${error.message}`);
    wrappedError.status = 500;
    throw wrappedError;
  }
};

/**
 * Validate a single row of CSV data for user creation
 * @param {Object} rowData - Data for the current row
 * @param {number} rowNumber - Row number in the CSV file
 * @param {Set} existingEmailsInCsv - Set of emails already encountered in the CSV for duplicate checking
 * @param {Set} existingUsernamesInCsv - Set of usernames already encountered in the CSV for duplicate checking
 * @returns {Promise<Object|null>} Validation result with errors or null if valid
 */
const validateUserRow = async (rowData, rowNumber, existingEmailsInCsv, existingUsernamesInCsv) => {
  const rowErrors = [];

  requiredColumns.forEach(col => {
    if (rowData[col] === null || rowData[col] === undefined || String(rowData[col]).trim() === ''){
      rowErrors.push(`Column '${col}' is required and cannot be empty`);
    }
  });

  const allEmails = await Admin.getAllEmails();

  const emailExists = allEmails.some(email => {
    const encryptedEmailString = email.email;

    const existingDecryptedEmail = decrypt(encryptedEmailString);

    const matchFound = existingDecryptedEmail === rowData.email;
    return matchFound;
  });

  if (emailExists) {
    rowErrors.push(`Email '${rowData.email}' already exists`);
  }

  if (existingEmailsInCsv.has(rowData.email)) {
    rowErrors.push(`Email '${rowData.email}' is a duplicate within the CSV file`);
  } else {
    existingEmailsInCsv.add(rowData.email);
  }

  if (existingUsernamesInCsv.has(rowData.username)) {
    rowErrors.push(`Username '${rowData.username}' is a duplicate within the CSV file`);
  } else if (rowData.username) {
    existingUsernamesInCsv.add(rowData.username);
  }

  if (rowErrors.length > 0) {
    return { row_number: rowNumber, error: rowErrors.join(', ') };
  }

  return null;
};

/**
 * Get foreign key values for role and department, and encrypt sensitive data
 * @param {Object} rowData - Data for the current row
 * @param {number} rowNumber - Row number in the CSV file
 * @returns {Promise<Object>} Processed user data with foreign keys and encrypted fields, or error information
 */
const getForeignKeyValues = async (rowData, rowNumber) => {
  const rowErrors = [];
  let userData = {...rowData};

  try {
    const roleId = await Admin.findRoleID(userData.role_name);
    if (roleId === null) {
      rowErrors.push(`Invalid role name: '${userData.role_name}'`);
    } else {
      userData.role_id = roleId;
    }

    const departmentId = await Admin.findDepartmentID(userData.department_name);
    if (departmentId === null) {
      rowErrors.push (`Invalid department name: '${userData.department_name}'`);
    } else {
      userData.department_id = departmentId;
    }

    const hashedPassword = await hash(userData.password);
    userData.password = hashedPassword;

    const encryptedEmail = encrypt(userData.email);
    userData.email = encryptedEmail;

    const encryptedPhone = encrypt(userData.phone_number);
    userData.phone_number = encryptedPhone;

    // Handle boss_id
    // Convert empty string to NULL
    if (userData.boss_id === '' || userData.boss_id === 'NULL') {
      userData.boss_id = null;
    } else if (userData.boss_id) {
      userData.boss_id = parseInt(userData.boss_id, 10);

      // Check if boss_id is a valid number after parsing
      if (isNaN(userData.boss_id)) {
        rowErrors.push(`Invalid boss_id: '${rowData.boss_id}' is not a valid number`);
        userData.boss_id = null;
      }
    }

  } catch (error) {
    rowErrors.push(`Error processing row ${rowNumber}`);
  }

  if (rowErrors.length > 0){
    return { row_number: rowNumber, error: rowErrors.join(', ') };
  }

  delete userData.role_name;
  delete userData.department_name;

  return userData;
};

/**
 * Parse CSV file for bulk user creation
 * @param {string} filePath - Path to the CSV file
 * @param {boolean} dummy - Flag to indicate if the file should be deleted after processing
 * @returns {Promise<Object>} Result of the CSV processing with counts and errors
 */
export const parseCSV = async (filePath, dummy) => {
  const results = {
    total_records: 0,
    created: 0,
    failed: 0,
    errors: []
  };
  let rowNumber = 0;
  const usersToCreate = [];

  const existingEmailsInCsv = new Set();
  const existingUsernamesInCsv = new Set();

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);

    const stream = fs.createReadStream(filePath);
    const parser = stream.pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    }));

    stream.on("error", (err) => {
      parser.emit('error', err);
    });

    parser.on("error", (err) => {
      results.errors.push({
        row_number: 'N/A',
        error: `CSV parsing failed ${err.message}`
      });
    });

    for await (const record of parser) {
      rowNumber++;
      results.total_records++;

      const rowValidationError = await validateUserRow(record, rowNumber,existingEmailsInCsv, existingUsernamesInCsv);

      if (rowValidationError) {
        results.failed++;
        results.errors.push(rowValidationError);
        continue;
      }

      const idValidation = await getForeignKeyValues(record, rowNumber);
      
      if (idValidation && idValidation.error) {
        results.failed++;
        results.errors.push(idValidation);
      } else {
        usersToCreate.push(idValidation);
      }
    }

    if (usersToCreate.length > 0) {
      try {
        const createdCount = await Admin.createMultipleUsers(usersToCreate);
        results.created = createdCount;
        results.failed += (usersToCreate.length - createdCount);
      } catch (error) {
        results.errors.push({
          row_number: 'N/A',
          error: "Bulk insert failed"
        });
        results.failed += usersToCreate.length;
      }
    }
  } catch (error) {
    if (!results.errors.some(err => err.row_number === 'N/A' && err.error.includes('CSV parsing failed'))) {
      results.errors.push({
        row_number: 'N/A',
        error: `Error processing CSV file: ${error.message}`
      });
    }

    results.failed = results.total_records - results.created;
  } finally {
    if (!dummy) {
      try {
        await fs.promises.unlink(filePath);
      } catch (unlinkError) {
          results.errors.push({
          row_number: 'N/A',
          error: `Error unlinking CSV file: ${unlinkError.message}`
        });
      }
    }
  }

  return results;
};

/**
 * Get list of all users (admin functionality)
 * @returns {Promise<Array>} List of users
 */
export async function getUserList(societyId = null) {
  try {
    const users = await Admin.getUserList(societyId);

    return users.map(user => {
      const decryptedUser = { ...user };
      decryptedUser.email = decrypt(user.email);
      decryptedUser.phone_number = decrypt(user.phone_number);
      return decryptedUser;
    });
  } catch (error) {
    throw new Error(`Error fetching user list: ${error.message}`);
  }
};

/**
 * Update user data (admin functionality)
 * @param {number} userId - ID of the user to update
 * @param {Object} newUserData - New data for the user
 * @returns {Promise<Object>} Result of the update operation
 */
export const updateUserData = async (userId, newUserData, options = {}) => {
  const userData = await User.getUserData(userId);
  if (!userData) {
    throw { status: 404, message: 'No information found for the user' };
  }

  let currPhoneNumber = null;
  if (userData.phone_number) {
    if (typeof userData.phone_number !== 'string') {
      throw { status: 500, message: 'Internal server error: Invalid phone number format in database.' };
    }
    currPhoneNumber = decrypt(userData.phone_number);
  }

  if (typeof userData.email !== 'string') {
    throw { status: 500, message: 'Internal server error: Invalid email format in database.' };
  }
  const currUserEmail = decrypt(userData.email);

  if (newUserData.email !== undefined && newUserData.email !== currUserEmail) {
    const allEmailRecords = await Admin.getAllEmails(); 
    
    const isEmailAlreadyInUse = allEmailRecords.some(emailRecord => {
      const encryptedEmailString = emailRecord.email; 

      if (typeof encryptedEmailString !== 'string') {
        return false;
      }

      const existingDecryptedEmail = decrypt(encryptedEmailString);
      
      const matchFound = existingDecryptedEmail === newUserData.email && encryptedEmailString !== userData.email;
      return matchFound;
    });
    
    if (isEmailAlreadyInUse) {
      throw { status: 400, message: 'Email already in use by another user' };
    }
  }

  const updatedFields = [];
  const fieldsToUpdateInDb = {};
  const keysToCompare = ['role_id', 'department_id', 'society_id', 'user_name', 'workstation', 'email', 'phone_number', 'boss_id'];

  for (const key of keysToCompare) {
    if (newUserData[key] !== undefined) {
      let actualCurrentValue;

      if (key === 'email') {
          actualCurrentValue = currUserEmail;
      } else if (key === 'phone_number') {
          actualCurrentValue = currPhoneNumber;
      } else {
          actualCurrentValue = userData[key];
      }

      if (newUserData[key] !== actualCurrentValue) {
        if (key === 'role_id') {
          fieldsToUpdateInDb.role_id = newUserData[key];
          updatedFields.push(key);
        } else if (key === 'department_id') {
          fieldsToUpdateInDb.department_id = newUserData[key];
          updatedFields.push(key);
        } else if (key === 'email' || key === 'phone_number') {
          const encryptedNewValue = encrypt(newUserData[key]);
          fieldsToUpdateInDb[key] = encryptedNewValue;
          updatedFields.push(key);
        } else if (key === 'user_name') {
          const userExists = await User.getUserUsername(newUserData[key]);
          if (!userExists || userExists.user_id === userId) {
            fieldsToUpdateInDb[key] = newUserData[key];
            updatedFields.push(key);
          } else {
            throw { status: 400, message: `Username already in use by another user: ${newUserData[key]}` };
          }
        } else if (key === 'boss_id') {
          fieldsToUpdateInDb[key] = newUserData[key] === '' ? null : newUserData[key];
          updatedFields.push(key);
        } else if (key === 'society_id') {
          fieldsToUpdateInDb[key] = newUserData[key] === '' ? null : newUserData[key];
          updatedFields.push(key);
        } else {
          fieldsToUpdateInDb[key] = newUserData[key];
          updatedFields.push(key);
        }
      }
    }
  }

  if (Object.keys(fieldsToUpdateInDb).length > 0) {
    await Admin.updateUser(userId, fieldsToUpdateInDb, options.connection);
    return { message: 'User updated successfully', updated_fields: updatedFields };
  }

  return { message: 'No changes detected, user data is up to date' };
};

// Get list of departments
export const getDepartments = async (societyGroupId = null) => {
  try {
    const departments = await Admin.getDepartments(societyGroupId);
    return departments;
  } catch (error) {
    throw new Error(`Error fetching departments: ${error.message}`);
  }
}

// Get list of roles
export const getRoles = async (societyGroupId = null) => {
  try {
    const roles = await Admin.getRoles(societyGroupId);
    return roles;
  } catch (error) {
    throw new Error(`Error fetching roles: ${error.message}`);
  }
}

// Get role details by ID
export const getRoleById = async (roleId, societyGroupId = null) => {
  try {
    const role = await Admin.getRoleById(roleId, societyGroupId);
    return role;
  } catch (error) {
    throw new Error(`Error fetching role: ${error.message}`);
  }
};

// Create a new role
export const createRole = async (roleData, societyGroupId = null) => {
  try {
    const role = await Admin.createRole(roleData, societyGroupId);
    return role;
  } catch (error) {
    throw new Error(`Error creating role: ${error.message}`);
  }
};

// Update an existing role
export const updateRole = async (roleId, roleData, societyGroupId = null) => {
  try {
    const updated = await Admin.updateRole(roleId, roleData, societyGroupId);
    return updated;
  } catch (error) {
    throw new Error(`Error updating role: ${error.message}`);
  }
};

export const getDefaultRole = async (societyGroupId = null) => {
  try {
    return await Admin.getDefaultRole(societyGroupId);
  } catch (error) {
    throw new Error(`Error fetching default role: ${error.message}`);
  }
};

export const setDefaultRole = async (roleId, societyGroupId = null) => {
  try {
    return await Admin.setDefaultRole(roleId, societyGroupId);
  } catch (error) {
    throw new Error(`Error setting default role: ${error.message}`);
  }
};

// Delete an existing role
export const deleteRole = async (roleId, societyGroupId = null) => {
  try {
    const deleted = await Admin.deleteRole(roleId, societyGroupId);
    return deleted;
  } catch (error) {
    throw new Error(`Error deleting role: ${error.message}`);
  }
};

// Get an auth rule by ID
export const getAuthRuleById = async (ruleId) => {
  try {
    const rule = await Admin.getAuthRuleById(ruleId);
    return rule;
  } catch (error) {
    throw new Error(`Error fetching authorization rule: ${error.message}`);
  }
};

// Get auth rules
export const getAuthRules = async (societyGroupId = null) => {
  try {
    const authRules = await Admin.getAuthRules(societyGroupId);
    return authRules;
  } catch (error) {
    throw new Error(`Error fetching authorization rules: ${error.message}`);
  }
};

// Create auth rule
export const createAuthRule = async (ruleData, societyGroupId = null) => {
  try {
    await Admin.createAuthRule(ruleData, societyGroupId);
    return { success: true, message: 'Authorization rule created successfully' };
  } catch (error) {
    throw new Error(`Error creating authorization rule: ${error.message}`);
  }
};

// Update auth rule
export const updateAuthRule = async (ruleId, updatedData, societyGroupId = null) => {
  try {
    await Admin.updateAuthRule(ruleId, updatedData, societyGroupId);
    return { success: true, message: 'Authorization rule updated successfully' };
  } catch (error) {
    throw new Error(`Error updating authorization rule: ${error.message}`);
  }
};

// Delete auth rule
export const deleteAuthRule = async (ruleId, societyGroupId = null) => {
  try {
    await Admin.deleteAuthRule(ruleId, societyGroupId);
    return { success: true, message: 'Authorization rule deleted successfully' };
  } catch (error) {
    throw new Error(`Error deleting authorization rule: ${error.message}`);
  }
};

// Get boss list for a department
export const getBossList = async (departmentId, societyGroupId = null, societyId = null) => {
  try {
    const bosses = await Admin.getBossList(departmentId, societyGroupId, societyId);
    return bosses;
  } catch (error) {
    throw new Error(`Error fetching boss list: ${error.message}`);
  }
};

// Create data from JSON import
export const createDataFromJson = async (jsonObj) => {
  try {
    const { users, departments, costCenters, societies, society_group_id, errors } = jsonObj;

    if (errors.length > 0) {
      return { success: false, message: 'Data extracted with some errors', errors };
    }

    // Track created and updated records
    const summary = {
      societies: { created: [], updated: [], skipped: [] },
      departments: { created: [], updated: [], skipped: [] },
      costCenters: { created: [], updated: [], skipped: [] },
      users: { created: [], updated: [], deactivated: [] }
    };

    // Mapping between JSON society IDs and actual database society IDs
    const societyIdMap = {};

    // 1: Create or update societies
    if (societies && societies.length > 0) {
      for (const society of societies) {
        const existingSociety = await Society.getSocietyByNameAndGroup(
          society.description,
          society_group_id
        );
        if (!existingSociety) {
          // Create new society and map the ID
          const createdSociety = await Society.createSociety(society);
          societyIdMap[society.id] = createdSociety.id;
          summary.societies.created.push(society.description);
        } else {
          // Map existing society ID
          societyIdMap[society.id] = existingSociety.id;
          // Check if description or currency changed
          if (existingSociety.description !== society.description
            || existingSociety.local_currency !== society.local_currency) {
            await Society.updateSociety(existingSociety.id, {
              description: society.description,
              local_currency: society.local_currency
            });
            summary.societies.updated.push(society.description);
          } else {
            summary.societies.skipped.push(society.description);
          }
        }
      }
    }

    // 2. Create cost centers
    for (const cc of costCenters) {
      const existingCC = await Admin.findCostCenterByID(cc.cost_center_id);
      if (!existingCC) {
        await Admin.createCostCenter({
          cost_center_id: cc.cost_center_id,
          cost_center_name: cc.cost_center_name,
          society_group_id
        });
        summary.costCenters.created.push(cc.cost_center_id);
      } else {
        // Check if name changed
        if (existingCC.cost_center_name !== cc.cost_center_name) {
          await Admin.updateCostCenter(cc.cost_center_id, {
            cost_center_name: cc.cost_center_name,
            society_group_id
          });
          summary.costCenters.updated.push({
            cost_center_id: cc.cost_center_id,
            old_name: existingCC.cost_center_name,
            new_name: cc.cost_center_name
          });
        } else {
          summary.costCenters.skipped.push(cc.cost_center_id);
        }
      }
    }

    // 3. Create departments
    for (const dept of departments) {
      const existingDeptId = society_group_id
        ? await Admin.findDepartmentID(dept.department_name, society_group_id)
        : await Admin.findDepartmentID(dept.department_name);
      if (!existingDeptId) {
        // Department doesn't exist, create it
        await Admin.createDepartment({
          department_name: dept.department_name,
          cost_center_id: dept.cost_center_id || null,
          society_group_id
        });
        summary.departments.created.push({
          name: dept.department_name,
          cost_center_id: dept.cost_center_id
        });
      } else {
        // Department exists, check if cost_center_id changed
        const existingDept = await Admin.getDepartmentById(existingDeptId);
        if (existingDept.cost_center_id !== dept.cost_center_id) {
          // Cost center changed, update it
          await Admin.updateDepartment(existingDeptId, {
            department_name: dept.department_name,
            cost_center_id: dept.cost_center_id || null,
            society_group_id
          });
          summary.departments.updated.push({
            name: dept.department_name,
            old_cost_center_id: existingDept.cost_center_id,
            new_cost_center_id: dept.cost_center_id
          });
        } else {
          summary.departments.skipped.push(dept.department_name);
        }
      }
    }

    // 4. Create users
    for (const user of users) {
      let boss_id = null;
      if (user.boss_user) {
        const boss = await User.getUserUsername(user.boss_user, society_group_id);
        if (boss) {
          boss_id = boss.user_id;
        }
      }

      const encryptedEmail = encrypt(user.email);
      const encryptedPhone = user.phone_number ? encrypt(user.phone_number) : null;

      console.log(`[DEBUG] Usuario: ${user.user_name}, Rol asignado: ${user.role}`);

      let roleId = society_group_id
        ? await Admin.findRoleID(user.role, society_group_id)
        : await Admin.findRoleID(user.role);

      // If role not found, try to find 'Solicitante' as fallback
      if (!roleId) {
        roleId = society_group_id
          ? await Admin.findRoleID('Solicitante', society_group_id)
          : await Admin.findRoleID('Solicitante');
      }
      
      // If still not found, log all available roles for debugging
      if (!roleId) {
        console.error(`[ERROR] No se pudo encontrar ningún rol para '${user.role}' ni fallback 'Solicitante'`);
      }

      const existingUser = await User.getUserUsername(user.user_name, society_group_id);

      // Build userData
      const userData = {
        role_id: roleId,
        department_id: society_group_id
          ? await Admin.findDepartmentID(user.department_name, society_group_id)
          : await Admin.findDepartmentID(user.department_name),
        user_name: user.user_name,
        workstation: user.workstation,
        email: encryptedEmail,
        phone_number: encryptedPhone,
        boss_id: boss_id,
        active: user.active || true,
        society_id: societyIdMap[user.society_id] || user.society_id
      };

      if (!existingUser) {
        // New user: add password
        const hashedPassword = await hash(user.password);
        userData.password = hashedPassword;
        
        await Admin.createUser(userData);
        summary.users.created.push({
          username: userData.user_name,
          role: user.role,
          department: user.department_name
        });
      } else {
        // Existing user: update without password
        await Admin.updateUser(existingUser.user_id, userData);
        summary.users.updated.push({
          username: userData.user_name,
          role: user.role,
          department: user.department_name
        });
      }
    }

    // 4. Deactivate users NOT in the JSON
    const processedUsernames = users.map(u => u.user_name);
    const deptIds = [];

    for (const dept of departments) {
      const deptId = await Admin.findDepartmentID(dept.department_name, society_group_id);
      if (deptId) {
        deptIds.push(deptId);
      }
    }

    if (deptIds.length > 0) {
      const deactivatedUsers = await Admin.deactivateUsersNotInList(deptIds, processedUsernames);
      if (deactivatedUsers.length > 0) {
        summary.users.deactivated = deactivatedUsers;
      }
    }

    return {
      success: true,
      message: 'Data imported successfully',
      summary: summary
    };
  } catch (error) {
    throw new Error(`Error creating data from JSON: ${error.message}`);
  }
};

export default {
  // Users
  createUser,
  getUserList,
  parseCSV,
  updateUserData,
  // Departments
  getDepartments,
  // Roles
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  // Auth rules
  getAuthRules,
  createAuthRule,
  updateAuthRule,
  deleteAuthRule,
  // Departments
  getBossList,
  // Import data
  createDataFromJson,
};
