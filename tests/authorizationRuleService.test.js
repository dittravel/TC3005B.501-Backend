/**
 * Unit tests for AuthorizationRuleService
 *
 * Covers:
 *   - selectApplicableRule: rule matching, 'Ambos' normalization, default fallback, null fallback
 *   - getNextApproverForRuleLevel: Jefe, Aleatorio (+ self-approval retry), Nivel_Superior, unknown type
 *   - getNLevelsUp: full traversal, short hierarchy fallback, no boss at all
 *   - isAuthorizationComplete: pure boundary logic
 *   - getNextAuthorizationLevel: pure increment with clamp
 *
 * Deliberately not covered:
 *   - getAllRules, getRuleById — thin model passthroughs with no business logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthorizationRuleService } from '../services/authorizationRuleService.js';

// --- Helpers ---

function makeRule(overrides = {}) {
  return {
    rule_id: 1,
    travel_type: 'Nacional',
    min_duration: 1,
    max_duration: 7,
    min_amount: 0,
    max_amount: 10000,
    is_default: false,
    ...overrides,
  };
}

function makeRuleLevel(overrides = {}) {
  return {
    level_number: 1,
    level_type: 'Jefe',
    superior_level_number: null,
    ...overrides,
  };
}

function makeRuleModel(overrides = {}) {
  return {
    async getRulesByCriteria() { throw new Error('unexpected getRulesByCriteria call'); },
    async getDefaultRule() { throw new Error('unexpected getDefaultRule call'); },
    async getAllRules() { throw new Error('unexpected getAllRules call'); },
    async getRuleById() { throw new Error('unexpected getRuleById call'); },
    ...overrides,
  };
}

function makeUserModel(overrides = {}) {
  return {
    async getBossId() { throw new Error('unexpected getBossId call'); },
    async getRandomUserByRoleName() { throw new Error('unexpected getRandomUserByRoleName call'); },
    ...overrides,
  };
}

// --- Tests ---

describe('selectApplicableRule', () => {
  it('returns the first matching rule when criteria are met', async () => {
    const rule = makeRule();
    const service = buildAuthorizationRuleService({
      ruleModel: makeRuleModel({
        async getRulesByCriteria() { return [rule]; },
      }),
    });

    const result = await service.selectApplicableRule('Nacional', 3, 5000);

    assert.deepEqual(result, rule);
  });

  it('falls back to the default rule when no criteria match', async () => {
    const defaultRule = makeRule({ is_default: true });
    const service = buildAuthorizationRuleService({
      ruleModel: makeRuleModel({
        async getRulesByCriteria() { return []; },
        async getDefaultRule() { return defaultRule; },
      }),
    });

    const result = await service.selectApplicableRule('Nacional', 3, 5000);

    assert.deepEqual(result, defaultRule);
  });

  it('normalizes "Ambos" to "Todos" before querying', async () => {
    let receivedType;
    const service = buildAuthorizationRuleService({
      ruleModel: makeRuleModel({
        async getRulesByCriteria(type) { receivedType = type; return [makeRule()]; },
      }),
    });

    await service.selectApplicableRule('Ambos', 2, 1000);

    assert.equal(receivedType, 'Todos');
  });

  it('returns null when no rules match and there is no default', async () => {
    const service = buildAuthorizationRuleService({
      ruleModel: makeRuleModel({
        async getRulesByCriteria() { return []; },
        async getDefaultRule() { return null; },
      }),
    });

    const result = await service.selectApplicableRule('Internacional', 10, 50000);

    assert.equal(result, null);
  });
});

describe('getNextApproverForRuleLevel', () => {
  it('returns direct boss for level_type "Jefe"', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({ async getBossId() { return 42; } }),
    });

    const result = await service.getNextApproverForRuleLevel(
      makeRuleLevel({ level_type: 'Jefe' }), 10, 1, 1
    );

    assert.equal(result, 42);
  });

  it('returns random authorizer user_id for level_type "Aleatorio"', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({
        async getRandomUserByRoleName() { return { user_id: 99 }; },
      }),
    });

    const result = await service.getNextApproverForRuleLevel(
      makeRuleLevel({ level_type: 'Aleatorio' }), 10, 2, 1
    );

    assert.equal(result, 99);
  });

  it('retries when random authorizer is the requester (self-approval prevention)', async () => {
    let callCount = 0;
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({
        async getRandomUserByRoleName() {
          callCount++;
          return callCount <= 2 ? { user_id: 10 } : { user_id: 77 };
        },
      }),
    });

    const result = await service.getNextApproverForRuleLevel(
      makeRuleLevel({ level_type: 'Aleatorio' }), 10, 2, 1
    );

    assert.equal(result, 77);
    assert.ok(callCount >= 3);
  });

  it('returns null when no authorizer exists for "Aleatorio"', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({
        async getRandomUserByRoleName() { return null; },
      }),
    });

    const result = await service.getNextApproverForRuleLevel(
      makeRuleLevel({ level_type: 'Aleatorio' }), 10, 2, 1
    );

    assert.equal(result, null);
  });

  it('returns null when all retries are exhausted and result is still the requester', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({
        // Always returns the requester — simulates a single-person department
        async getRandomUserByRoleName() { return { user_id: 10 }; },
      }),
    });

    const result = await service.getNextApproverForRuleLevel(
      makeRuleLevel({ level_type: 'Aleatorio' }), 10, 2, 1
    );

    assert.equal(result, null);
  });

  it('traverses N levels up for level_type "Nivel_Superior"', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({
        async getBossId(id) {
          if (id === 10) return 20;
          if (id === 20) return 30;
          return null;
        },
      }),
    });

    const result = await service.getNextApproverForRuleLevel(
      makeRuleLevel({ level_type: 'Nivel_Superior', superior_level_number: 2 }), 10, 1, 1
    );

    assert.equal(result, 30);
  });

  it('also accepts "Nivel Superior" (with space) as level_type', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({ async getBossId() { return 55; } }),
    });

    const result = await service.getNextApproverForRuleLevel(
      makeRuleLevel({ level_type: 'Nivel Superior', superior_level_number: 1 }), 10, 1, 1
    );

    assert.equal(result, 55);
  });

  it('returns null for unknown level_type', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel(),
    });

    const result = await service.getNextApproverForRuleLevel(
      makeRuleLevel({ level_type: 'Desconocido' }), 10, 1, 1
    );

    assert.equal(result, null);
  });
});

describe('getNLevelsUp', () => {
  it('returns the user exactly N levels up', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({
        async getBossId(id) {
          if (id === 1) return 2;
          if (id === 2) return 3;
          return null;
        },
      }),
    });

    const result = await service.getNLevelsUp(1, 2);

    assert.equal(result, 3);
  });

  it('returns the highest available boss when hierarchy is shorter than N', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({
        async getBossId(id) {
          if (id === 1) return 2;
          return null;
        },
      }),
    });

    const result = await service.getNLevelsUp(1, 3);

    assert.equal(result, 2);
  });

  it('returns null when the requester has no boss at all', async () => {
    const service = buildAuthorizationRuleService({
      userModel: makeUserModel({ async getBossId() { return null; } }),
    });

    const result = await service.getNLevelsUp(1, 2);

    assert.equal(result, null);
  });
});

describe('isAuthorizationComplete', () => {
  // Pure function — inject empty mocks to avoid any DB-layer side effects
  const { isAuthorizationComplete } = buildAuthorizationRuleService({
    ruleModel: makeRuleModel(),
    userModel: makeUserModel(),
  });

  it('returns true when current level equals total levels', () => {
    assert.equal(isAuthorizationComplete(3, 3), true);
  });

  it('returns true when current level exceeds total levels', () => {
    assert.equal(isAuthorizationComplete(4, 3), true);
  });

  it('returns false when current level is below total', () => {
    assert.equal(isAuthorizationComplete(2, 3), false);
  });
});

describe('getNextAuthorizationLevel', () => {
  const { getNextAuthorizationLevel } = buildAuthorizationRuleService({
    ruleModel: makeRuleModel(),
    userModel: makeUserModel(),
  });

  it('increments the current level by one', () => {
    assert.equal(getNextAuthorizationLevel(1, 3), 2);
  });

  it('clamps at numLevelsInRule when already at the last level', () => {
    assert.equal(getNextAuthorizationLevel(3, 3), 3);
  });
});
