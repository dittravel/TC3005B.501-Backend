/**
 * AuthorizationRuleModel
 *
 * This model provides functions for querying authorization rules
 * based on various criteria such as travel type, duration, and amount.
 */

import { prisma } from '../lib/prisma.js';

const AuthorizationRuleModel = {
  // Get all active authorization rules
  async getAllRules() {
    try {
      return await prisma.authorizationRule.findMany({
        where: { active: true },
        orderBy: [
          { is_default: 'asc' },
          { rule_id: 'asc' },
        ],
      });
    } catch (error) {
      console.error('Error fetching authorization rules:', error);
      throw error;
    }
  },

  // Get a single rule by ID with its levels
  async getRuleById(ruleId) {
    try {
      const rule = await prisma.authorizationRule.findUnique({
        where: { rule_id: ruleId },
        include: {
          levels: {
            orderBy: { level_number: 'asc' },
          },
        },
      });
      if (!rule) return null;
      // For compatibility, return levels as 'levels' property
      return {
        ...rule,
        levels: rule.levels,
      };
    } catch (error) {
      console.error('Error fetching authorization rule by ID:', error);
      throw error;
    }
  },

  // Get rules that match travel type, duration, and amount criteria
  // Returns all active rules that could potentially apply
  async getRulesByCriteria(travelType, duration, amount, societyId) {
    try {
      // Build dynamic Prisma where clause
      const where = {
        AND: [
          { active: true },
          {
            OR: [
              { society_id: Number(societyId) },
              { society_id: null },
            ],
          },
          travelType ? {
            OR: [
              { travel_type: 'Todos' },
              { travel_type: travelType },
            ],
          } : {},
          {
            OR: [
              { min_duration: null },
              { min_duration: { lte: duration } },
            ],
          },
          {
            OR: [
              { max_duration: null },
              { max_duration: { gte: duration } },
            ],
          },
          {
            OR: [
              { min_amount: null },
              { min_amount: { lte: amount } },
            ],
          },
          {
            OR: [
              { max_amount: null },
              { max_amount: { gte: amount } },
            ],
          },
        ],
      };
      const rules = await prisma.authorizationRule.findMany({
        where,
        orderBy: [
          { is_default: 'asc' },
          { rule_id: 'asc' },
        ],
        include: {
          levels: {
            orderBy: { level_number: 'asc' },
          },
        },
      });
      // For compatibility, return levels as 'levels' property
      return rules.map(rule => ({
        ...rule,
        levels: rule.levels,
      }));
    } catch (error) {
      console.error('Error fetching authorization rules by criteria:', error);
      throw error;
    }
  },

  // Get default active authorization rule
  async getDefaultRule(societyId) {
    try {
      const rule = await prisma.authorizationRule.findFirst({
        where: {
          is_default: true,
          active: true,
          society_id: Number(societyId)
        },
        orderBy: { rule_id: 'asc' },
        include: {
          levels: {
            orderBy: { level_number: 'asc' },
          },
        },
      });
      if (!rule) return null;
      return {
        ...rule,
        levels: rule.levels,
      };
    } catch (error) {
      console.error('Error fetching default authorization rule:', error);
      throw error;
    }
  },
};

export default AuthorizationRuleModel;
