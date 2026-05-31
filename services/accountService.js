/**
 * Accounting Accounts Service
 *
 * Business logic for accounting accounts management.
 */

import AccountModel from '../models/accountModel.js';

export async function getAccounts(societyId, currentUser) {
  if (!societyId) {
    const error = new Error('Society ID is required');
    error.status = 400;
    throw error;
  }

  const accounts = await AccountModel.getAccounts(societyId);
  return Array.isArray(accounts) ? accounts : [];
}

export async function getAccountById(accountId, currentUser) {
  const account = await AccountModel.getAccountById(accountId, currentUser.society_id);

  if (!account) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }

  return account;
}

export async function createAccount(data, currentUser) {
  return await AccountModel.createAccount(data);
}

export async function updateAccount(accountId, data, currentUser) {
  const account = await AccountModel.getAccountById(accountId);

  if (!account) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }

  return await AccountModel.updateAccount(accountId, data);
}

export async function deleteAccount(accountId, currentUser) {
  const account = await AccountModel.getAccountById(accountId);

  if (!account) {
    const error = new Error('Account not found');
    error.status = 404;
    throw error;
  }

  await AccountModel.deleteAccount(accountId);
  return account;
}

export async function getCostCentersBySociety(societyId) {
  if (!societyId) {
    const error = new Error('Society ID is required');
    error.status = 400;
    throw error;
  }

  const costCenters = await AccountModel.getCostCentersBySociety(societyId);
  return costCenters || [];
}

export default {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getCostCentersBySociety,
};
