/**
 * Accounting Accounts Controller
 *
 * Data access layer for accounting accounts
 */

import { prisma } from '../lib/prisma.js';

export async function getAccounts(societyId) {
  return await prisma.account.findMany({
    where: {
      active: true,
      society_id: societyId
    },
    include: {
      CostCenter: {
        select: {
          cost_center_name: true
        }
      }
    }
  });
}

export async function getAccountById(accountId, societyId) {
  return await prisma.account.findUnique({
    where: {
      active: true,
      account_id: accountId,
      society_id: societyId
    },
    include: {
      CostCenter: {
        select: {
          cost_center_name: true
        }
      }
    }
  });
}

export async function createAccount(data) {
  return await prisma.account.create({
    data: {
      account_code: data.account_code,
      account_name: data.account_name,
      account_type: data.account_type,
      description: data.description,
      society_id: data.society_id,
      cost_center_id: Number(data.cost_center_id),
    }
  });
}

export async function updateAccount(accountId, data) {
  return await prisma.account.update({
    where: { account_id: accountId },
    data: {
      account_name: data.account_name,
      account_type: data.account_type,
      description: data.description,
      cost_center_id: Number(data.cost_center_id),
    }
  });
}

export async function deleteAccount(accountId) {
  return await prisma.account.update({
    where: { account_id: accountId },
    data: { active: false }
  });
}

export async function getCostCentersBySociety(societyId) {
  return await prisma.costCenter.findMany({
    where: { society_id: societyId },
    select: {
      cost_center_id: true,
      cost_center_name: true,
      cost_center_code: true,
    },
    orderBy: { cost_center_name: 'asc' }
  });
}

export default {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getCostCentersBySociety
};
