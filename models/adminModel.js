/**
* Admin Model
* 
* This model provides functions for managing users, including creating
* multiple users finding role and department IDs, checking for existing users
* by email, creating a single user, retrieving all emails, updating user
* information, and deactivating users.
*/

import db from '../database/config/db.js';
import pool from '../database/config/db.js';

const Admin = {
  // Find applicant by ID
  async getUserList() {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(`SELECT * FROM UserFullInfo 
        WHERE active = 1 ORDER BY department_id`);
        return rows;
    } catch (error) {
      console.error('Error finding applicant by ID:', error);
      throw error;
    } finally {
      if (conn){
        conn.release();
      } 
    }
  },
    
    // Create multiple users in a single batch operation
    async createMultipleUsers(users, connection = null) {
      let conn;
      const values = users.map(user => [
        user.role_id,
        user.department_id,
        user.boss_id || null,
        user.user_name,
        user.password,
        user.workstation,
        user.email,
        user.phone_number
      ]);
      
      const query = `
        INSERT INTO User (
          role_id,
          department_id,
          boss_id,
          user_name,
          password,
          workstation,
          email,
          phone_number
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      try {
        conn = connection || (await pool.getConnection());
        const result = await conn.batch(query, values);
        return result.affectedRows;
        
      } catch (error) {
        console.error('Error getting completed requests:', error);
        throw error;
        
      } finally {
        if (!connection && conn){
          conn.release();
        } 
      }
    },
    
    // Find role ID by role name
    async findRoleID(role_name) {
      let conn;
      try {
        conn = await pool.getConnection();
        const name = await conn.query(
          'SELECT role_id FROM Role WHERE role_name = ?',
          [role_name]
        );

      if (name && name.length > 0) {
        return name[0].role_id;
      }
      return null;

    } catch (error) {
      console.error('Error finding role ID for %s:', role_name, error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
  
  // Find department ID by department name
  async findDepartmentID(department_name) {
    let conn;
    try {
      conn = await pool.getConnection();
      const name = await conn.query(
        'SELECT department_id FROM Department WHERE department_name = ?',
        [department_name]
      );
      
      if (name && name.length > 0) {
        return name[0].department_id;
      }
      return null;

    } catch (error) {
      console.error('Error finding department ID for %s:', department_name, error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
  
  // Check if a user exists by email
  async findUserByEmail(email) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.execute(
        'SELECT user_id FROM User WHERE email = ?',
        [email]
      );
      
      if (rows && rows.length > 0) {
        return true;
      } else if (rows === undefined || rows === null) {
        return false;
      }
      return false;

    } catch (error) {
      console.error('Database Error in findUserByEmail:', error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
  
  // Create a single user
  async createUser(userData, connection = null) {
    let conn;
    conn = connection || (await db.getConnection());
    try{
      const existingUser = await conn.query(`
        SELECT user_id FROM User
        WHERE email = ? OR user_name = ?`,
        [userData.email, userData.user_name]
      );
      
      if (existingUser.length > 0) {
        throw new Error('User with this email or username already exists');
      }
      
      const result = await conn.query(`
        INSERT INTO User (
          role_id,
          department_id,
          user_name,
          password,
          workstation,
          email,
          phone_number,
          boss_id,
          creation_date
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          userData.role_id,
          userData.department_id,
          userData.user_name,
          userData.password,
          userData.workstation,
          userData.email,
          userData.phone_number,
          userData.boss_id || null
        ]
      );

        return {
          user_id: result.insertId,
        };
    } finally {
      if (!connection) conn.release();
    }
  },
  
  // Retrieve all user emails
  async getAllEmails() {
    let conn;
    
    const query = `
      SELECT email FROM User;
    `;
    
    try {
      conn = await pool.getConnection();
      
      const allEmails = conn.query(query);
      return allEmails;

    } catch (error) {
      throw error;

      } finally {
        if (conn) conn.release();
      }
    },
    
    // Update user information
    async updateUser(user_id, fieldsToUpdate, connection = null) {
      let conn;
      const setClauses = [];
      const values =[];
      
      for (const field in fieldsToUpdate) {
        setClauses.push(`${field} = ?`);
        values.push(fieldsToUpdate[field]);
      }
      
      values.push(user_id);
      
      const query = `
        UPDATE User
        SET ${setClauses.join(', ')}
        WHERE user_id = ?
      `;
      try {
        conn = connection || (await pool.getConnection());
        const result = await conn.query(query, values);
        return result;

    } catch (error) {
      throw error;

    } finally {
      if (!connection && conn) conn.release();
    }
  },
  
  // Deactivate a user by ID
  async deactivateUserById(userId, connection = null) {
    let conn;
    try {
      conn = connection || (await pool.getConnection());
      const result = await conn.query(
        `UPDATE User SET active = FALSE WHERE user_id = ?`,
        [userId]
      );
      return result.affectedRows > 0;

    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
      
    } finally {
      if (!connection && conn) {
        conn.release();
      }
    }
  },

  // Get departments
  async getDepartments() {
    let conn;
    try {
      conn = await pool.getConnection();
      const departments = await conn.query(`SELECT department_id, department_name FROM Department`);
      return departments;
    } catch (error) {
      console.error('Error getting departments:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Get roles
  async getRoles() {
    let conn;
    try {
      conn = await pool.getConnection();
      const roles = await conn.query(`SELECT role_id, role_name FROM Role`);
      return roles;
    } catch (error) {
      console.error('Error getting roles:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Get an auth rule by ID
  async getAuthRuleById(ruleId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rules = await conn.query(`
        SELECT * FROM AuthorizationRule 
        WHERE rule_id = ?`, 
        [ruleId]
      );
      
      if (rules.length === 0) {
        return null; // No rule found with the given ID
      }
      
      const rule = rules[0];
      
      const levels = await conn.query(
        `SELECT
          level_number,
          level_type,
          superior_level_number
        FROM AuthorizationRuleLevel
        WHERE rule_id = ?
        ORDER BY level_number`,
        [ruleId]
      );
      
      rule.levels = levels;
      return rule;

    } catch (error) {
      console.error('Error getting auth rule by ID:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Get auth rules
  async getAuthRules() {
    let conn;
    try {
      conn = await pool.getConnection();

      // Get all auth rules
      const rules = await conn.query(`SELECT * FROM AuthorizationRule`);

      // For each rule, get its associated auth levels
      for (const rule of rules) {
        const levels = await conn.query(
          `SELECT
            level_number,
            level_type,
            superior_level_number
          FROM AuthorizationRuleLevel
          WHERE rule_id = ?
          ORDER BY level_number`,
          [rule.rule_id]
        );
        rule.levels = levels;
      }

      return rules;
    } catch (error) {
      console.error('Error getting auth rules:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Create auth rule
  async createAuthRule(ruleData) {
    let conn;
    try {
      conn = await pool.getConnection();

      // Create the new auth rule
      const ruleRes = await conn.query(`
        INSERT INTO AuthorizationRule (
          rule_name,
          is_default,
          num_levels,
          automatic,
          travel_type,
          min_duration,
          max_duration,
          min_amount,
          max_amount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ruleData.rule_name,
        ruleData.is_default,
        ruleData.num_levels,
        ruleData.automatic,
        ruleData.travel_type,
        ruleData.min_duration,
        ruleData.max_duration,
        ruleData.min_amount,
        ruleData.max_amount
      ]);

      // Validate ruleRes.insertId before using it
      const rule_id = ruleRes.insertId;
      if (!rule_id) {
        throw new Error("Failed to retrieve rule_id after inserting AuthorizationRule");
      }

      const levels = Array.isArray(ruleData.niveles) ? ruleData.niveles : [];
      if (levels.length > 0) {
        const authLevelValues = levels.map(level => [
          rule_id,
          level.level_number,
          level.level_type,
          level.superior_level_number
        ]);

        await conn.batch(`
          INSERT INTO AuthorizationRuleLevel (
            rule_id,
            level_number,
            level_type,
            superior_level_number
          )
          VALUES (?, ?, ?, ?)
        `, authLevelValues);
      }

    } catch (error) {
      console.error('Error creating auth rule:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Update auth rule
  async updateAuthRule(ruleId, ruleData) {
    let conn;
    try {
      conn = await pool.getConnection();

      // Update the auth rule
      await conn.query(`
        UPDATE AuthorizationRule
        SET
          rule_name = ?,
          is_default = ?,
          num_levels = ?,
          automatic = ?,
          travel_type = ?,
          min_duration = ?,
          max_duration = ?,
          min_amount = ?,
          max_amount = ?
        WHERE rule_id = ?
      `, [
        ruleData.rule_name,
        ruleData.is_default,
        ruleData.num_levels,
        ruleData.automatic,
        ruleData.travel_type,
        ruleData.min_duration,
        ruleData.max_duration,
        ruleData.min_amount,
        ruleData.max_amount,
        ruleId
      ]);

      // Delete existing auth levels for the rule
      await conn.query(`DELETE FROM AuthorizationRuleLevel WHERE rule_id = ?`, [ruleId]);

      // Create new auth levels
      const authLevelValues = ruleData.niveles.map(level => [
        ruleId,
        level.level_number,
        level.level_type,
        level.superior_level_number
      ]);

      const levels = Array.isArray(ruleData.niveles) ? ruleData.niveles : [];
      if (levels.length > 0) {
        await conn.batch(`
          INSERT INTO AuthorizationRuleLevel (
            rule_id,
            level_number,
            level_type,
            superior_level_number
          )
          VALUES (?, ?, ?, ?)
        `, authLevelValues);
      }

    } catch (error) {
      console.error('Error updating auth rule:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Delete auth rule
  async deleteAuthRule(ruleId) {
    let conn;
    try {
      conn = await pool.getConnection();

      // Delete auth levels associated with the rule
      await conn.query(`DELETE FROM AuthorizationRuleLevel WHERE rule_id = ?`, [ruleId]);

      // Delete the auth rule
      await conn.query(`DELETE FROM AuthorizationRule WHERE rule_id = ?`, [ruleId]);

      console.log(`Auth rule with ID ${ruleId} and its associated levels have been deleted.`);
    } catch (error) {
      console.error('Error deleting auth rule:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Get boss list for a department
  async getBossList(departmentId) {
    let conn;
    try {
      conn = await pool.getConnection();

      // Fetch users who are authorizers (role_id = 4)
      const bosses = await conn.query(`
        SELECT
          user_id,
          user_name
        FROM User
        WHERE department_id = ?
        AND active = 1
        AND role_id = 4
      `, [departmentId]);
      return bosses;
    } catch (error) {
      console.error('Error fetching boss list:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Find department ID by department name
  async findDepartmentID(department_name) {
    let conn;
    try {
      conn = await pool.getConnection();
      const name = await conn.query(
        'SELECT department_id FROM Department WHERE department_name = ?',
        [department_name]
      );
      
      if (name && name.length > 0) {
        return name[0].department_id;
      }
      return null;

    } catch (error) {
      console.error('Error finding department ID for %s:', department_name, error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  // Create department
  async createDepartment(departmentData) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query(`
        INSERT INTO Department (
          department_name,
          cost_center_id
        )
        VALUES (?, ?)
      `, [
        departmentData.department_name
      ]
      );
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },

  // Find cost center ID by cost center name
  async findCostCenterID(cost_center_name) {
    let conn;
    try {
      conn = await pool.getConnection();
      const name = await conn.query(
        'SELECT cost_center_id FROM CostCenter WHERE cost_center_name = ?',
        [cost_center_name]
      );
      
      if (name && name.length > 0) {
        return name[0].cost_center_id;
      }
      return null;

    } catch (error) {
      console.error('Error finding cost center ID for %s:', cost_center_name, error);
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },

  // Create cost center
  async createCostCenter(costCenterData) {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.query(`
        INSERT INTO CostCenter (
          cost_center_name
        )
        VALUES (?)
      `, [
        costCenterData.cost_center_name,
      ]
      );
    } catch (error) {
      console.error('Error creating cost center:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },
};
  
export default Admin;
