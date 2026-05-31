/**
 * Accounting Accounts Controller
 *
 * HTTP handlers for accounting accounts management
 */

import AuditLogService from '../services/auditLogService.js';
import AccountService from '../services/accountService.js';

export async function getAccounts(req, res) {
  try {
    const societyId = req.user.society_id;
    const accounts = await AccountService.getAccounts(societyId, req.user);
    return res.status(200).json(accounts);
  } catch (error) {
    console.error('Error getting accounting accounts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAccountById(req, res) {
  try {
    const account = await AccountService.getAccountById(Number(req.params.account_id), req.user);
    return res.status(200).json(account);
  } catch (error) {
    console.error('Error getting accounting account:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function createAccount(req, res) {
  try {
    const accountData = {
      ...req.body,
      society_id: req.user.society_id,
    };
    const account = await AccountService.createAccount(accountData, req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'ACCOUNT_CREATED',
      entityType: 'Account',
      entityId: account.account_id,
      metadata: {
        code: account.account_code,
        name: account.account_name,
        type: account.account_type,
      },
    });
    return res.status(201).json(account);
  } catch (error) {
    console.error('Error creating accounting account:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function updateAccount(req, res) {
  try {
    const account = await AccountService.updateAccount(Number(req.params.account_id), req.body, req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'ACCOUNT_UPDATED',
      entityType: 'Account',
      entityId: account.id,
      metadata: {
        code: account.code,
        name: account.name,
        type: account.type,
      },
    });
    return res.status(200).json(account);
  } catch (error) {
    console.error('Error updating accounting account:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteAccount(req, res) {
  try {
    const deletedAccount = await AccountService.deleteAccount(Number(req.params.account_id), req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'ACCOUNT_DELETED',
      entityType: 'Account',
      entityId: deletedAccount.id,
      metadata: {
        code: deletedAccount.code,
        name: deletedAccount.name,
        type: deletedAccount.type,
      },
    });
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getCostCenters(req, res) {
  try {
    const societyId = req.user.society_id;
    const costCenters = await AccountService.getCostCentersBySociety(societyId);
    return res.status(200).json(costCenters);
  } catch (error) {
    console.error('Error getting cost centers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getCostCenters,
};
