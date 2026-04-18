/**
 * AuthorizationRuleService
 *
 * Service for managing authorization rule selection and approval logic.
 * Handles the business logic for:
 * - Selecting the most appropriate rule based on travel parameters
 * - Determining next approvers based on rule level configuration
 * - Managing authorization level progression
 */

import AuthorizationRuleModel from '../models/authorizationRuleModel.js';
import User from '../models/userModel.js';

/**
 * Factory for creating an AuthorizationRuleService with injected dependencies.
 * Enables unit testing without a live database.
 * @param {{ ruleModel?: object, userModel?: object }} deps
 */
export function buildAuthorizationRuleService({ ruleModel = AuthorizationRuleModel, userModel = User } = {}) {
  const service = {
    /**
     * Select the most appropriate authorization rule based on travel parameters
     * @param {string} travelType - Type of travel ('Nacional', 'Internacional', or 'Ambos')
     * @param {number} duration - Duration of travel in days
     * @param {number} amount - Amount requested in MXN
     * @returns {object|null} The selected authorization rule with levels, or null if none found
     */
    async selectApplicableRule(travelType, duration, amount) {
      try {
        // Normalize travel type if needed
        let normalizedTravelType = travelType;
        if (travelType === 'Ambos') {
          // For 'Ambos' (both), we'll prefer exact matches but accept 'Todos'
          normalizedTravelType = 'Todos';
        }

        // Get all rules that match the criteria
        const matchingRules = await ruleModel.getRulesByCriteria(
          normalizedTravelType,
          duration,
          amount
        );

        // If no matching rules found, try to get the default rule as fallback
        if (matchingRules.length === 0) {
          const defaultRule = await ruleModel.getDefaultRule();
          return defaultRule;
        }

        // Return the first matching rule (already sorted by is_default DESC)
        return matchingRules[0];
      } catch (error) {
        console.error('Error selecting applicable authorization rule:', error);
        throw error;
      }
    },

    // Get all available rules for displaying to users
    async getAllRules() {
      try {
        return await ruleModel.getAllRules();
      } catch (error) {
        console.error('Error fetching all rules:', error);
        throw error;
      }
    },

    // Get a specific rule by ID
    async getRuleById(ruleId) {
      try {
        return await ruleModel.getRuleById(ruleId);
      } catch (error) {
        console.error('Error fetching rule by ID:', error);
        throw error;
      }
    },

    /**
     * Get the next approver based on authorization rule level configuration
     * @param {object} ruleLevel - The AuthorizationRuleLevel object with level_type and superior_level_number
     * @param {number} requesterUserId - The ID of the user who created the request
     * @param {number} departmentId - The department of the requester
     * @param {number} societyGroupId - The society group ID
     * @returns {number|null} The user_id of the next approver, or null if none found
     */
    async getNextApproverForRuleLevel(ruleLevel, requesterUserId, departmentId, societyGroupId) {
      try {
        if (ruleLevel.level_type === 'Jefe') {
          // Direct boss
          const boss = await userModel.getBossId(requesterUserId);
          return boss;
        } else if (ruleLevel.level_type === 'Aleatorio') {
          // Random authorizer from the department
          let randomAuthorizer = await userModel.getRandomUserByRoleName('Autorizador', departmentId, societyGroupId);

          // If authorizer == requester, try again
          if (randomAuthorizer && randomAuthorizer.user_id === requesterUserId) {
            let attempts = 0;
            while (attempts < 5 && randomAuthorizer && randomAuthorizer.user_id === requesterUserId) {
              randomAuthorizer = await userModel.getRandomUserByRoleName('Autorizador', departmentId, societyGroupId);
              attempts++;
            }
          }

          if (randomAuthorizer) {
            return randomAuthorizer.user_id;
          } else {
            // No authorizer found in department
            return null;
          }
        } else if (ruleLevel.level_type === 'Nivel_Superior' || ruleLevel.level_type === 'Nivel Superior') {
          // N levels up the hierarchy
          const levelsUp = ruleLevel.superior_level_number || 1;
          const superiorUserId = await service.getNLevelsUp(requesterUserId, levelsUp);
          return superiorUserId;
        }
        return null;
      } catch (error) {
        console.error('Error getting next approver for rule level:', error);
        throw error;
      }
    },

    /**
     * Get the user N levels up in the hierarchy
     * If N levels don't exist, returns the highest available boss
     *
     * @param {number} userId - Starting user ID
     * @param {number} levels - How many levels up to go
     * @returns {number|null} The user_id N levels up, or highest available, or null
     */
    async getNLevelsUp(userId, levels) {
      try {
        let currentUserId = userId;
        let currentLevel = 0;
        console.log(`[getNLevelsUp] Start: userId=${userId}, levels=${levels}`);
        while (currentLevel < levels) {
          const nextBossId = await userModel.getBossId(currentUserId);
          console.log(`[getNLevelsUp] Level ${currentLevel + 1}: currentUserId=${currentUserId}, nextBossId=${nextBossId}`);
          if (!nextBossId) {
            // No more bosses available, return the current highest boss
            console.log(`[getNLevelsUp] No more bosses at level ${currentLevel + 1}, or boss is requester. Returning null.`);
            return currentUserId === userId ? null : currentUserId; // If we never moved up, return null
          }
          currentUserId = nextBossId;
          currentLevel++;
        }

        return currentUserId;
      } catch (error) {
        console.error('Error getting N levels up:', error);
        throw error;
      }
    },

    /**
     * Determine if authorization is complete based on rule
     * @param {number} currentLevel - Current authorization level (0-indexed from the rule)
     * @param {number} numLevelsInRule - Total levels in the rule (num_levels)
     * @returns {boolean} True if all authorization levels completed
     */
    isAuthorizationComplete(currentLevel, numLevelsInRule) {
      // currentLevel is 0-indexed, so when it reaches numLevelsInRule, we're done
      return currentLevel >= numLevelsInRule;
    },

    /**
     * Get the next authorization level to assign to
     * @param {number} currentLevel - Current authorization level
     * @param {number} numLevelsInRule - Total levels in the rule
     * @returns {number} Next authorization level
     */
    getNextAuthorizationLevel(currentLevel, numLevelsInRule) {
      const nextLevel = currentLevel + 1;
      return Math.min(nextLevel, numLevelsInRule);
    },
  };

  return service;
}

export default buildAuthorizationRuleService();
