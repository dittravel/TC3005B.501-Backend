/**
* Admin Model
* 
* Database operations for admin functions
*/

import { prisma } from '../lib/prisma.js';

const Admin = {
  // Get all active users with full information
  async getUserList() {
    try {
      const users = await prisma.user.findMany({
        where: { active: true },
        orderBy: { department_id: 'asc' },
        include: {
          role: {
            select: { role_name: true }
          },
          department: {
            select: { 
              department_name: true,
              CostCenter: {
                select: { cost_center_name: true }
              }
            }
          }
        }
      });

      // Format the response to match the expected structure
      return users.map(user => ({
        user_id: user.user_id,
        user_name: user.user_name,
        email: user.email,
        active: user.active,
        role_name: user.role?.role_name || null,
        department_name: user.department?.department_name || null,
        department_id: user.department_id,
        cost_center_name: user.department?.CostCenter?.cost_center_name || null
      }));
    } catch (error) {
      console.error('Error finding user list:', error);
      throw error;
    }
  },
    
  // Create multiple users in a single batch operation
  async createMultipleUsers(users) {
    try {
      const result = await prisma.user.createMany({
        data: users.map(user => ({
          role_id: user.role_id,
          department_id: user.department_id,
          boss_id: user.boss_id || null,
          user_name: user.user_name,
          password: user.password,
          workstation: user.workstation,
          email: user.email,
          phone_number: user.phone_number
        })),
      });
      return result.count;
    } catch (error) {
      console.error('Error creating multiple users:', error);
      throw error;
    }
  },
    
  // Find role ID by role name
  async findRoleID(role_name) {
    try {
      const role = await prisma.role.findUnique({
        where: { role_name },
        select: { role_id: true }
      });
      return role ? role.role_id : null;
    } catch (error) {
      console.error('Error finding role ID for %s:', role_name, error);
      throw error;
    }
  },
  
  // Find department ID by department name
  async findDepartmentID(department_name) {
    try {
      const department = await prisma.department.findUnique({
        where: { department_name },
        select: { department_id: true }
      });
      return department ? department.department_id : null;
    } catch (error) {
      console.error('Error finding department ID for %s:', department_name, error);
      throw error;
    }
  },
  
  // Check if a user exists by email
  async findUserByEmail(email) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { user_id: true }
      });
      return !!user;
    } catch (error) {
      console.error('Database Error in findUserByEmail:', error);
      throw error;
    }
  },
  
  // Create a single user
  async createUser(userData) {
    try {
      // Check if user with same email or username already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { user_name: userData.user_name }
          ]
        },
        select: { user_id: true }
      });
      if (existing) {
        throw new Error('User with this email or username already exists');
      }
      const user = await prisma.user.create({
        data: {
          role_id: userData.role_id,
          department_id: userData.department_id,
          user_name: userData.user_name,
          password: userData.password,
          workstation: userData.workstation || null,
          email: userData.email,
          phone_number: userData.phone_number || null,
          boss_id: userData.boss_id || null,
          society_id: userData.society_id || null
        },
        select: { user_id: true }
      });
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  // Retrieve all user emails
  async getAllEmails() {
    try {
      const emails = await prisma.user.findMany({
        select: { email: true }
      });
      return emails;
    } catch (error) {
      throw error;
    }
  },
    
  // Update user information
  async updateUser(userId, fieldsToUpdate) {
    try {
      // Filter out null/undefined values first
      // Prisma doesnt accept null values for updating fields
      const data = {};
      for (const [key, value] of Object.entries(fieldsToUpdate)) {
        if (value !== null && value !== undefined) {
          data[key] = value;
        }
      }
      
      // Convert IDs to connect format for Prisma relations
      // updateUser controller receives role_id, department_id and boss_id as plain IDs,
      // but Prisma expects a connect object for relations
      if (data.role_id) {
        data.role = { connect: { role_id: data.role_id } };
        delete data.role_id;
      }
      if (data.department_id) {
        data.department = { connect: { department_id: data.department_id } };
        delete data.department_id;
      }
      if (data.boss_id) {
        data.boss = { connect: { user_id: data.boss_id } };
        delete data.boss_id;
      }
      
      return await prisma.user.update({
        where: { user_id: Number(userId) },
        data,
        select: { user_id: true }
      });
    } catch (error) {
      throw error;
    }
  },
  
  // Deactivate a user by ID
  async deactivateUserById(userId) {
    try {
      const user = await prisma.user.update({
        where: { user_id: userId },
        data: { active: false },
        select: { user_id: true }
      });
      return !!user;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  },

  // Get departments
  async getDepartments() {
    try {
      const departments = await prisma.department.findMany({
        select: { department_id: true, department_name: true }
      });
      return departments;
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    }
  },

  // Get roles
  async getRoles() {
    try {
      const roles = await prisma.role.findMany({
        select: { role_id: true, role_name: true }
      });
      return roles;
    } catch (error) {
      console.error('Error getting roles:', error);
      throw error;
    }
  },

  // Get an auth rule by ID
  async getAuthRuleById(ruleId) {
    try {
      const id = Number(ruleId);
      const rule = await prisma.authorizationRule.findUnique({
        where: { rule_id: id },
        include: {
          levels: {
            orderBy: { level_number: 'asc' },
            select: {
              level_number: true,
              level_type: true,
              superior_level_number: true
            }
          }
        }
      });
      return rule;
    } catch (error) {
      console.error('Error getting auth rule by ID:', error);
      throw error;
    }
  },

  // Get auth rules
  async getAuthRules() {
    try {
      const rules = await prisma.authorizationRule.findMany({
        include: {
          levels: {
            orderBy: { level_number: 'asc' },
            select: {
              level_number: true,
              level_type: true,
              superior_level_number: true
            }
          }
        }
      });
      return rules;
    } catch (error) {
      console.error('Error getting auth rules:', error);
      throw error;
    }
  },

  // Create auth rule
  async createAuthRule(ruleData) {
    try {
      // Step 1: Create the new authorization rule
      const rule = await prisma.authorizationRule.create({
        data: {
          rule_name: ruleData.rule_name,
          is_default: ruleData.is_default,
          num_levels: ruleData.num_levels,
          automatic: ruleData.automatic,
          travel_type: ruleData.travel_type,
          min_duration: ruleData.min_duration,
          max_duration: ruleData.max_duration,
          min_amount: ruleData.min_amount,
          max_amount: ruleData.max_amount,
          levels: {
            create: (Array.isArray(ruleData.levels) ? ruleData.levels : []).map(level => ({
              level_number: level.level_number,
              level_type: level.level_type,
              superior_level_number: Number(level.superior_level_number) ?? null
            }))
          }
        }
      });
      return rule;
    } catch (error) {
      console.error('Error creating auth rule:', error);
      throw error;
    }
  },

  // Update auth rule
  async updateAuthRule(ruleId, ruleData) {
    try {
      const id = Number(ruleId);
      // Step 1: Update the main authorization rule fields
      await prisma.authorizationRule.update({
        where: { rule_id: id },
        data: {
          rule_name: ruleData.rule_name,
          is_default: ruleData.is_default,
          num_levels: ruleData.num_levels,
          automatic: ruleData.automatic,
          travel_type: ruleData.travel_type,
          min_duration: ruleData.min_duration,
          max_duration: ruleData.max_duration,
          min_amount: ruleData.min_amount,
          max_amount: ruleData.max_amount
        }
      });

      // Step 2: Delete all existing levels for this rule
      await prisma.authorizationRuleLevel.deleteMany({ where: { rule_id: id } });

      // Step 3: Create new levels if provided
      const levels = Array.isArray(ruleData.levels) ? ruleData.levels : [];
      if (levels.length > 0) {
        await prisma.authorizationRuleLevel.createMany({
          data: levels.map(level => ({
            rule_id: id,
            level_number: level.level_number,
            level_type: level.level_type,
            superior_level_number: Number(level.superior_level_number) ?? null
          }))
        });
      }
      return true;
    } catch (error) {
      console.error('Error updating auth rule:', error);
      throw error;
    }
  },

  // Delete auth rule
  async deleteAuthRule(ruleId) {
    try {
      const id = Number(ruleId);
      // Step 1: Delete all levels associated with the rule
      await prisma.authorizationRuleLevel.deleteMany({ where: { rule_id: id } });
      // Step 2: Delete the rule itself
      await prisma.authorizationRule.delete({ where: { rule_id: id } });
      console.log(`Auth rule with ID ${ruleId} and its associated levels have been deleted.`);
      return true;
    } catch (error) {
      console.error('Error deleting auth rule:', error);
      throw error;
    }
  },

  // Get boss list for a department
  async getBossList(departmentId) {
    try {
      // Fetch users who are authorizers (role_id = 4)
      const bosses = await prisma.user.findMany({
        where: {
          department_id: Number(departmentId),
          active: true,
          role_id: 4
        },
        select: {
          user_id: true,
          user_name: true
        }
      });
      return bosses;
    } catch (error) {
      console.error('Error fetching boss list:', error);
      throw error;
    }
  },

  // Find department ID by department name
  async findDepartmentID(department_name) {
    try {
      const department = await prisma.department.findUnique({
        where: { department_name },
        select: { department_id: true }
      });
      return department ? department.department_id : null;
    } catch (error) {
      console.error('Error finding department ID for %s:', department_name, error);
      throw error;
    }
  },

  // Create department
  async createDepartment(departmentData) {
    try {
      await prisma.department.create({
        data: {
          department_name: departmentData.department_name,
          cost_center_id: departmentData.cost_center_id ?? null
        }
      });
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  },

  // Update department
  async updateDepartment(departmentId, departmentData) {
    try {
      await prisma.department.update({
        where: { department_id: departmentId },
        data: {
          department_name: departmentData.department_name,
          cost_center_id: departmentData.cost_center_id ?? null
        }
      });
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  },

  // Get department by ID (including cost_center_id)
  async getDepartmentById(departmentId) {
    try {
      const dept = await prisma.department.findUnique({
        where: { department_id: departmentId },
        select: { department_id: true, department_name: true, cost_center_id: true }
      });
      return dept;
    } catch (error) {
      console.error('Error getting department by ID:', error);
      throw error;
    }
  },

  // Find cost center ID by cost center name
  async findCostCenterID(cost_center_name) {
    try {
      const costCenter = await prisma.costCenter.findUnique({
        where: { cost_center_name },
        select: { cost_center_id: true }
      });
      return costCenter ? costCenter.cost_center_id : null;
    } catch (error) {
      console.error('Error finding cost center ID for %s:', cost_center_name, error);
      throw error;
    }
  },

  // Find cost center by ID
  async findCostCenterByID(cost_center_id) {
    try {
      if (!cost_center_id) return null;
      const costCenter = await prisma.costCenter.findUnique({
        where: { cost_center_id },
        select: { cost_center_id: true, cost_center_name: true }
      });
      return costCenter || null;
    } catch (error) {
      console.error('Error finding cost center by ID %s:', cost_center_id, error);
      throw error;
    }
  },

  // Update cost center
  async updateCostCenter(cost_center_id, costCenterData) {
    try {
      await prisma.costCenter.update({
        where: { cost_center_id },
        data: {
          cost_center_name: costCenterData.cost_center_name
        }
      });
    } catch (error) {
      console.error('Error updating cost center:', error);
      throw error;
    }
  },

  // Create cost center
  async createCostCenter(costCenterData) {
    try {
      const data = {
        cost_center_name: costCenterData.cost_center_name
      };
      
      // If cost_center_id is provided, use it (manual ID).
      // Otherwise autoincrement will handle it
      if (costCenterData.cost_center_id) {
        data.cost_center_id = costCenterData.cost_center_id;
      }
      
      await prisma.costCenter.create({ data });
    } catch (error) {
      console.error('Error creating cost center:', error);
      throw error;
    }
  },

  // Deactivate users in departments that are NOT in the provided username list
  async deactivateUsersNotInList(departmentIds, usernameList) {
    try {
      if (!departmentIds || departmentIds.length === 0) {
        return [];
      }

      // Get all active users in specified departments
      const allDeptUsers = await prisma.user.findMany({
        where: {
          department_id: { in: departmentIds },
          active: true
        },
        select: { user_id: true, user_name: true }
      });

      // Deactivate users not in the provided list
      const deactivatedUsers = [];
      for (const deptUser of allDeptUsers) {
        if (!usernameList.includes(deptUser.user_name)) {
          await this.deactivateUserById(deptUser.user_id);
          deactivatedUsers.push({
            user_id: deptUser.user_id,
            user_name: deptUser.user_name
          });
        }
      }

      return deactivatedUsers;
    } catch (error) {
      console.error('Error deactivating users not in list:', error);
      throw error;
    }
  },
};
  
export default Admin;
