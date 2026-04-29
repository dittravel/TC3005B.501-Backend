/**
 * Society Controller
 *
 * HTTP handlers for society (individual company) management.
 */

import AuditLogService from '../services/auditLogService.js';
import SocietyService from '../services/societyService.js';

export async function getSocieties(req, res) {
  try {
    const societyGroupId = req.user.role === 'Superadministrador' ? null : req.user.society_group_id
    const societies = await SocietyService.getSocieties(societyGroupId, req.user);
    return res.status(200).json(societies);
  } catch (error) {
    console.error('Error getting societies:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSocietyById(req, res) {
  try {
    const society = await SocietyService.getSocietyById(Number(req.params.society_id), req.user);
    return res.status(200).json(society);
  } catch (error) {
    console.error('Error getting society:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getCurrentUserSociety(req, res) {
  try {
    const societyId = req.user.society_id;
    if (!societyId) {
      return res.status(404).json({ error: 'User has no associated society' });
    }
    const society = await SocietyService.getSocietyById(societyId, req.user);
    return res.status(200).json(society);
  } catch (error) {
    console.error('Error getting user society:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function createSociety(req, res) {
  try {
    const society = await SocietyService.createSociety(req.body, req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'SOCIETY_CREATED',
      entityType: 'Society',
      entityId: society.id,
      metadata: {
        description: society.description,
        local_currency: society.local_currency,
        society_group_id: society.society_group_id,
      },
    });
    return res.status(201).json(society);
  } catch (error) {
    console.error('Error creating society:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function updateSociety(req, res) {
  try {
    const society = await SocietyService.updateSociety(Number(req.params.society_id), req.body, req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'SOCIETY_UPDATED',
      entityType: 'Society',
      entityId: society.id,
      metadata: {
        description: society.description,
        local_currency: society.local_currency,
        society_group_id: society.society_group_id,
      },
    });
    return res.status(200).json(society);
  } catch (error) {
    console.error('Error updating society:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteSociety(req, res) {
  try {
    const deletedSociety = await SocietyService.deleteSociety(Number(req.params.society_id), req.user);
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'SOCIETY_DELETED',
      entityType: 'Society',
      entityId: deletedSociety.id,
      metadata: {
        description: deletedSociety.description,
        local_currency: deletedSociety.local_currency,
        society_group_id: deletedSociety.society_group_id,
      },
    });
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting society:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getSocietyName(req, res) {
  try {
    const name = await SocietyService.getSocietyName(Number(req.params.society_id));
    return res.status(200).json({ description: name });
  } catch (error) {
    console.error('Error getting society name:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export default {
  getSocieties,
  getSocietyById,
  getSocietyName,
  createSociety,
  updateSociety,
  deleteSociety
};
