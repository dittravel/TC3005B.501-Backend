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
  async createMultipleUsers(users) {
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
      conn = await pool.getConnection();
      const result = await conn.batch(query, values);
      return result.affectedRows;
      
    } catch (error) {
      console.error('Error getting completed requests:', error);
      throw error;
      
    } finally {
      if (conn){
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
  async createUser(userData) {
    const connection = await db.getConnection();
    try{
      const existingUser = await connection.query(`
        SELECT user_id FROM User
        WHERE email = ? OR user_name = ?`,
        [userData.email, userData.user_name]
      );
      
      if (existingUser.length > 0) {
        throw new Error('User with this email or username already exists');
      }
      
      await connection.query(`
        INSERT INTO User (
          role_id,
          department_id,
          user_name,
          password,
          workstation,
          email,
          phone_number,
          creation_date,
          boss_id
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
    } finally {
      connection.release();
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
  async updateUser(user_id, fieldsToUpdate) {
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
      conn = await pool.getConnection();
      const result = await conn.query(query, values);
      return result;

    } catch (error) {
      throw error;

    } finally {
      if (conn) conn.release();
    }
  },
  
  // Deactivate a user by ID
  async deactivateUserById(userId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query(
        `UPDATE User SET active = FALSE WHERE user_id = ?`,
        [userId]
      );
      return result.affectedRows > 0;

    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
      
    } finally {
      if (conn) {
        conn.release();
      }
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
          `SELECT level, type, user_id FROM AuthorizationRuleLevel WHERE rule_id = ? ORDER BY level`,
          [rule.id]
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
          name,
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
        ruleData.is_default,
        ruleData.num_levels,
        ruleData.automatic,
        ruleData.travel_type,
        ruleData.min_duration,
        ruleData.max_duration,
        ruleData.min_amount,
        ruleData.max_amount
      ]);

      // Create associated auth levels
      const authLevelValues = ruleData.niveles.map(level => [
        ruleRes.insertId,
        level.level,
        level.type,
        level.user_id
      ]);

      await conn.batch(`
        INSERT INTO AuthorizationRuleLevel (
          rule_id,
          level,
          type,
          user_id
        )
        VALUES (?, ?, ?, ?)
      `, authLevelValues);

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
          name = ?,
          is_default = ?,
          num_levels = ?,
          automatic = ?,
          travel_type = ?,
          min_duration = ?,
          max_duration = ?,
          min_amount = ?,
          max_amount = ?
        WHERE id = ?
      `, [
        ruleData.name,
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
        level.level,
        level.type,
        level.user_id
      ]);

      const levels = Array.isArray(ruleData.niveles) ? ruleData.niveles : [];
      if (levels.length > 0) {
        await conn.batch(`
          INSERT INTO AuthorizationRuleLevel (
            rule_id,
            level,
            type,
            user_id
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
      await conn.query(`DELETE FROM AuthorizationRule WHERE id = ?`, [ruleId]);

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
      const bosses = await conn.query(`
        SELECT user_id, user_name FROM User
        WHERE department_id = ? AND active = 1
      `, [departmentId]);
      return bosses;
    } catch (error) {
      console.error('Error fetching boss list:', error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  },
};
  
export default Admin;
  