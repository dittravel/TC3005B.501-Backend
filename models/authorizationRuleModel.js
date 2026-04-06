/**
 * AuthorizationRuleModel
 *
 * This model provides functions for querying authorization rules
 * based on various criteria such as travel type, duration, and amount.
 */

import pool from '../database/config/db.js';

const AuthorizationRuleModel = {
  // Get all authorization rules
  async getAllRules() {
    let conn;
    try {
      conn = await pool.getConnection();
      const rows = await conn.query(`
        SELECT * FROM AuthorizationRule 
        ORDER BY is_default ASC, rule_id ASC
      `);
      return rows;
    } catch (error) {
      console.error('Error fetching authorization rules:', error);
      throw error;
    } finally {
      if (conn) {
        conn.release();
      }
    }
  },

  // Get a single rule by ID with its levels
  async getRuleById(ruleId) {
    let conn;
    try {
      conn = await pool.getConnection();
      const rule = await conn.query(`
        SELECT * FROM AuthorizationRule 
        WHERE rule_id = ?
      `, [ruleId]);

      if (rule.length === 0) {
        return null;
      }

      const levels = await conn.query(`
        SELECT * FROM AuthorizationRuleLevel 
        WHERE rule_id = ?
        ORDER BY level_number ASC
      `, [ruleId]);

      return {
        ...rule[0],
        levels: levels
      };
    } catch (error) {
      console.error('Error fetching authorization rule by ID:', error);
      throw error;
    } finally {
      if (conn) {
        conn.release();
      }
    }
  },

  // Get rules that match travel type, duration, and amount criteria
  // Returns all rules that could potentially apply
  async getRulesByCriteria(travelType, duration, amount) {
    let conn;
    try {
      conn = await pool.getConnection();

      // Build dynamic query based on travel type matching
      // Travel type can be: 'Nacional', 'Internacional', 'Todos'
      let whereConditions = [];
      
      if (travelType) {
        whereConditions.push(`(travel_type = 'Todos' OR travel_type = '${travelType}')`);
      }

      const rows = await conn.query(`
        SELECT * FROM AuthorizationRule 
        WHERE ${whereConditions.join(' AND ')}
          AND (min_duration IS NULL OR min_duration <= ?)
          AND (max_duration IS NULL OR max_duration >= ?)
          AND (min_amount IS NULL OR min_amount <= ?)
          AND (max_amount IS NULL OR max_amount >= ?)
        ORDER BY is_default ASC, rule_id ASC
      `, [duration, duration, amount, amount]);

      // Fetch levels for each rule
      const rulesWithLevels = await Promise.all(
        rows.map(async (rule) => {
          const levels = await conn.query(`
            SELECT * FROM AuthorizationRuleLevel 
            WHERE rule_id = ?
            ORDER BY level_number ASC
          `, [rule.rule_id]);

          return {
            ...rule,
            levels: levels
          };
        })
      );

      return rulesWithLevels;
    } catch (error) {
      console.error('Error fetching authorization rules by criteria:', error);
      throw error;
    } finally {
      if (conn) {
        conn.release();
      }
    }
  },

  // Get default authorization rule
  async getDefaultRule() {
    let conn;
    try {
      conn = await pool.getConnection();
      const rule = await conn.query(`
        SELECT * FROM AuthorizationRule 
        WHERE is_default = TRUE
        LIMIT 1
      `);

      if (rule.length === 0) {
        return null;
      }

      const levels = await conn.query(`
        SELECT * FROM AuthorizationRuleLevel 
        WHERE rule_id = ?
        ORDER BY level_number ASC
      `, [rule[0].rule_id]);

      return {
        ...rule[0],
        levels: levels
      };
    } catch (error) {
      console.error('Error fetching default authorization rule:', error);
      throw error;
    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
};

export default AuthorizationRuleModel;
