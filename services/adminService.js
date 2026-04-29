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

const SUPERADMIN_ROLE_NAME = 'Superadministrador';

function getActorPermissionKeys(actor = null) {
  return new Set(
    Array.isArray(actor?.permissions)
      ? actor.permissions.map((permission) => String(permission).trim()).filter(Boolean)
      : []
  );
}

function canManageSuperAdmins(actor = null) {
  if (!actor) return false;
  const permissionKeys = getActorPermissionKeys(actor);
  return actor.role === SUPERADMIN_ROLE_NAME || permissionKeys.has('superadmin:manage_master_admins');
}

function canManageGroups(actor = null) {
  if (!actor) return false;
  const permissionKeys = getActorPermissionKeys(actor);
  return actor.role === SUPERADMIN_ROLE_NAME || permissionKeys.has('superadmin:manage_groups');
}

function resolveEffectiveSocietyId(requestedSocietyId, actor = null) {
  if (!actor) {
    return requestedSocietyId || null;
  }

  const actorSocietyId = actor?.society_id ? Number(actor.society_id) : null;

  if (canManageGroups(actor)) {
    if (requestedSocietyId === null || requestedSocietyId === undefined || requestedSocietyId === '') {
      return actorSocietyId;
    }
    return Number(requestedSocietyId);
  }

  if (!actorSocietyId) {
    throw { status: 400, message: 'El usuario actual no tiene una sociedad asignada' };
  }

  if (requestedSocietyId !== null && requestedSocietyId !== undefined && requestedSocietyId !== '') {
    const parsedRequestedSocietyId = Number(requestedSocietyId);
    if (parsedRequestedSocietyId !== actorSocietyId) {
      throw { status: 403, message: 'No puedes crear o mover usuarios fuera de tu sociedad' };
    }
  }

  return actorSocietyId;
}

async function assertDepartmentScopeAllowed(departmentId, actor = null) {
  if (!departmentId || !actor || canManageGroups(actor)) return;

  const department = await Admin.getDepartmentById(Number(departmentId));
  if (!department) {
    throw { status: 400, message: 'Departamento inválido' };
  }

  if (
    department.society_id !== null &&
    actor?.society_id !== null &&
    actor?.society_id !== undefined &&
    Number(department.society_id) !== Number(actor.society_id)
  ) {
    throw { status: 403, message: 'No puedes asignar departamentos fuera de tu sociedad' };
  }
}

async function assertRoleAssignmentAllowed(roleId, actor = null) {
  if (!roleId) return;

  const role = await Admin.getRoleMetaById(roleId);
  if (!role) {
    throw { status: 400, message: 'Rol inválido' };
  }

  if (role.role_name === SUPERADMIN_ROLE_NAME && !canManageSuperAdmins(actor)) {
    throw { status: 403, message: 'No tienes permisos para asignar el rol de superadministrador' };
  }
}

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
    await assertRoleAssignmentAllowed(userData.role_id, options.actor);
    await assertDepartmentScopeAllowed(userData.department_id, options.actor);
    const effectiveSocietyId = resolveEffectiveSocietyId(userData.society_id, options.actor);

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
      society_id: effectiveSocietyId,
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
const getForeignKeyValues = async (rowData, rowNumber, options = {}) => {
  const rowErrors = [];
  let userData = {...rowData};
  const actor = options?.actor || null;
  let effectiveSocietyId = null;

  try {
    effectiveSocietyId = resolveEffectiveSocietyId(userData.society_id, actor);
  } catch (scopeError) {
    return {
      row_number: rowNumber,
      error: scopeError?.message || 'Invalid society scope for user creation',
    };
  }

  try {
    const roleId = await Admin.findRoleID(userData.role_name, effectiveSocietyId);
    if (roleId === null) {
      rowErrors.push(`Invalid role name: '${userData.role_name}'`);
    } else {
      await assertRoleAssignmentAllowed(roleId, actor);
      userData.role_id = roleId;
    }

    const departmentId = await Admin.findDepartmentID(userData.department_name, effectiveSocietyId);
    if (departmentId === null) {
      rowErrors.push (`Invalid department name: '${userData.department_name}'`);
    } else {
      await assertDepartmentScopeAllowed(departmentId, actor);
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
  userData.society_id = effectiveSocietyId;

  return userData;
};

/**
 * Parse CSV file for bulk user creation
 * @param {string} filePath - Path to the CSV file
 * @param {boolean} dummy - Flag to indicate if the file should be deleted after processing
 * @returns {Promise<Object>} Result of the CSV processing with counts and errors
 */
export const parseCSV = async (filePath, dummy, options = {}) => {
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

      const idValidation = await getForeignKeyValues(record, rowNumber, options);
      
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

  if (newUserData.role_id !== undefined) {
    await assertRoleAssignmentAllowed(newUserData.role_id, options.actor);
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
          fieldsToUpdateInDb[key] = newUserData[key] === ''
            ? null
            : resolveEffectiveSocietyId(newUserData[key], options.actor);
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
export const getDepartments = async (societyId = null) => {
  try {
    const departments = await Admin.getDepartments(societyId);
    return departments;
  } catch (error) {
    throw new Error(`Error fetching departments: ${error.message}`);
  }
}

// Get list of roles
export const getRoles = async (societyId = null, requester = null) => {
  try {
    const roles = await Admin.getRoles(societyId, requester);
    return roles;
  } catch (error) {
    throw new Error(`Error fetching roles: ${error.message}`);
  }
}

// Get role details by ID
export const getRoleById = async (roleId, societyId = null, requester = null) => {
  try {
    const role = await Admin.getRoleById(roleId, societyId, requester);
    return role;
  } catch (error) {
    throw new Error(`Error fetching role: ${error.message}`);
  }
};

// Create a new role
export const createRole = async (roleData, societyId = null, requester = null) => {
  try {
    const role = await Admin.createRole(roleData, societyId, requester);
    return role;
  } catch (error) {
    throw new Error(`Error creating role: ${error.message}`);
  }
};

// Update an existing role
export const updateRole = async (roleId, roleData, societyId = null, requester = null) => {
  try {
    const updated = await Admin.updateRole(roleId, roleData, societyId, requester);
    return updated;
  } catch (error) {
    throw new Error(`Error updating role: ${error.message}`);
  }
};

export const getDefaultRole = async (societyId = null, requester = null) => {
  try {
    return await Admin.getDefaultRole(societyId, requester);
  } catch (error) {
    throw new Error(`Error fetching default role: ${error.message}`);
  }
};

export const setDefaultRole = async (roleId, societyId = null, requester = null) => {
  try {
    return await Admin.setDefaultRole(roleId, societyId, requester);
  } catch (error) {
    throw new Error(`Error setting default role: ${error.message}`);
  }
};

// Delete an existing role
export const deleteRole = async (roleId, societyId = null, requester = null) => {
  try {
    const deleted = await Admin.deleteRole(roleId, societyId, requester);
    return deleted;
  } catch (error) {
    throw new Error(`Error deleting role: ${error.message}`);
  }
};

export const getMasterAdmins = async (requester = null) => {
  try {
    return await Admin.getMasterAdmins(requester);
  } catch (error) {
    const wrapped = new Error(`Error fetching master admins: ${error.message}`);
    wrapped.status = error.status || 500;
    throw wrapped;
  }
};

export const createMasterAdmin = async (userData, requester = null) => {
  try {
    return await Admin.createMasterAdmin(userData, requester);
  } catch (error) {
    const wrapped = new Error(`Error creating master admin: ${error.message}`);
    wrapped.status = error.status || 500;
    throw wrapped;
  }
};

// Get an auth rule by ID
export const getAuthRuleById = async (ruleId, societyId = null) => {
  try {
    const rule = await Admin.getAuthRuleById(ruleId, societyId);
    return rule;
  } catch (error) {
    throw new Error(`Error fetching authorization rule: ${error.message}`);
  }
};

// Get auth rules
export const getAuthRules = async (societyId = null) => {
  try {
    const authRules = await Admin.getAuthRules(societyId);
    return authRules;
  } catch (error) {
    throw new Error(`Error fetching authorization rules: ${error.message}`);
  }
};

// Create auth rule
export const createAuthRule = async (ruleData, societyId = null) => {
  try {
    await Admin.createAuthRule(ruleData, societyId);
    return { success: true, message: 'Authorization rule created successfully' };
  } catch (error) {
    throw new Error(`Error creating authorization rule: ${error.message}`);
  }
};

// Update auth rule
export const updateAuthRule = async (ruleId, updatedData, societyId = null) => {
  try {
    await Admin.updateAuthRule(ruleId, updatedData, societyId);
    return { success: true, message: 'Authorization rule updated successfully' };
  } catch (error) {
    throw new Error(`Error updating authorization rule: ${error.message}`);
  }
};

// Delete auth rule
export const deleteAuthRule = async (ruleId, societyId = null) => {
  try {
    await Admin.deleteAuthRule(ruleId, societyId);
    return { success: true, message: 'Authorization rule deleted successfully' };
  } catch (error) {
    throw new Error(`Error deleting authorization rule: ${error.message}`);
  }
};

// Get boss list for a department
export const getBossList = async (departmentId, societyId = null) => {
  try {
    const bosses = await Admin.getBossList(departmentId, societyId);
    return bosses;
  } catch (error) {
    throw new Error(`Error fetching boss list: ${error.message}`);
  }
};

// Create data from JSON import
export const createDataFromJson = async (jsonObj) => {
  try {
    const { users, departments, costCenters, society_id, errors } = jsonObj;
    
    if (errors.length > 0) {
      return { success: false, message: 'Data extracted with some errors', errors };
    }

    if (!society_id) {
      return { success: false, message: 'Society ID not provided' };
    }

    // Track records for summary
    const summary = {
      departments: { created: [], updated: [], skipped: [] },
      costCenters: { created: [], updated: [], skipped: [] },
      users: { created: [], updated: [], skipped: [], deactivated: [] }
    };

    // 1. Create cost centers
    for (const cc of costCenters) {
      const existingCC = await Admin.findCostCenterByCode(cc.cost_center_code, society_id);
      if (!existingCC) {
        await Admin.createCostCenter({
          cost_center_code: cc.cost_center_code,
          cost_center_name: cc.cost_center_name,
          society_id
        });
        summary.costCenters.created.push(cc.cost_center_code);
      } else {
        // Check if name or code changed
        if (existingCC.cost_center_name !== cc.cost_center_name 
          || existingCC.cost_center_code !== cc.cost_center_code
        ) {
          await Admin.updateCostCenter(
            existingCC.cost_center_id, {
            cost_center_code: cc.cost_center_code,
            cost_center_name: cc.cost_center_name,
            society_id
          });
          summary.costCenters.updated.push(cc.cost_center_code);
        } else {
          summary.costCenters.skipped.push(cc.cost_center_code);
        }
      }
    }

    // 2. Create departments
    for (const dept of departments) {
      // Check if cost center exists for the department
      const costCenter = dept.cost_center_code
        ? await Admin.findCostCenterByCode(dept.cost_center_code, society_id)
        : null;
      const costCenterId = costCenter ? costCenter.cost_center_id : null;
      
      // Check if department exists
      const existingDeptId = await Admin.findDepartmentID(dept.department_name, society_id);

      if (!existingDeptId) {
        // Department doesn't exist, create it
        await Admin.createDepartment({
          department_name: dept.department_name,
          cost_center_id: costCenterId,
          society_id
        });
        summary.departments.created.push(dept.department_name);
      } else {
        // Department exists, check if cost_center_id changed
        const existingDept = await Admin.getDepartmentById(existingDeptId);
        if (existingDept.cost_center_id !== costCenterId) {
          // Cost center changed, update it
          await Admin.updateDepartment(
            existingDeptId, {
            department_name: dept.department_name,
            cost_center_id: costCenterId,
            society_id
          });
          summary.departments.updated.push(dept.department_name);
        } else {
          summary.departments.skipped.push(dept.department_name);
        }
      }
    }

    // 3. Create users
    for (const user of users) {
      let boss_id = null;
      if (user.boss_user) {
        const boss = await User.getUserUsername(user.boss_user);
        if (boss) {
          boss_id = boss.user_id;
        }
      }

      const encryptedEmail = encrypt(user.email);
      const encryptedPhone = user.phone_number ? encrypt(user.phone_number) : null;

      const existingUser = await User.getUserUsername(user.user_name, society_id);

      let roleId = null;

      // For new users, assign role from employee hierarchy
      if (!existingUser) {
        const importedRole = await Admin.getRoleByName(user.role, society_id);
        if (importedRole) {
          roleId = importedRole.role_id;
          console.log(`[DEBUG] Usuario nuevo ${user.user_name}: Asignando rol ${user.role}`);
        } else {
          console.error(`[ERROR] No se pudo encontrar rol ${user.role} para la sociedad ${society_id}`);
        }
      } else {
        // For existing users, keep their current role
        roleId = existingUser.role_id;
        console.log(`[DEBUG] Usuario existente ${user.user_name}: Manteniendo rol actual`);
      }

      // Build userData
      const userData = {
        role_id: roleId,
        department_id: await Admin.findDepartmentID(user.department_name, society_id),
        user_name: user.user_name,
        workstation: user.workstation,
        email: encryptedEmail,
        phone_number: encryptedPhone,
        boss_id: boss_id,
        active: user.active || true,
        society_id: society_id,
        supplier: user.supplier || null
      };

      try {
        if (!existingUser) {
          // New user: add password
          const hashedPassword = await hash(user.password);
          userData.password = hashedPassword;

          await Admin.createUser(userData);
          summary.users.created.push(userData.user_name);
        } else {
          // Existing user: update without password, keep role unchanged
          delete userData.role_id;
          await Admin.updateUser(existingUser.user_id, userData);
          summary.users.updated.push(userData.user_name);
        }
      } catch (error) {
        // If user creation/update fails, add to skipped
        summary.users.skipped.push(user.user_name);
      }
    }

    // 4. Deactivate users NOT in the JSON
    const processedUsernames = users.map(u => u.user_name);
    const deptIds = [];

    // For each department, get its ID to find users in those departments
    for (const dept of departments) {
      const deptId = await Admin.findDepartmentID(dept.department_name, society_id);
      if (deptId) {
        deptIds.push(deptId);
      }
    }

    // Only attempt to deactivate users if we have department IDs for the deactivation
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
  getMasterAdmins,
  createMasterAdmin,
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
