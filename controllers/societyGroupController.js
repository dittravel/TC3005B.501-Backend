/**
 * Society Group Controller
 *
 * HTTP handlers for society group management and administration.
 */

import AuditLogService from '../services/auditLogService.js';
import SocietyGroupService from '../services/societyGroupService.js';

export async function getSocietyGroups(req, res) {
  try {
    const groups = await SocietyGroupService.getSocietyGroups(req.user);
    return res.status(200).json(groups);
  } catch (error) {
    console.error('Error getting society groups:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSocietyGroupById(req, res) {
  try {
    const group = await SocietyGroupService.getSocietyGroupById(
      Number(req.params.group_id),
      req.user
    );
    return res.status(200).json(group);
  } catch (error) {
    console.error('Error getting society group:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function createSocietyGroup(req, res) {
  try {
    const group = await SocietyGroupService.createSocietyGroup(
      req.body,
      req.user
    );
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'SOCIETY_GROUP_CREATED',
      entityType: 'SocietyGroup',
      entityId: group.id,
      metadata: {
        description: group.description,
        bootstrap_society_id: group.bootstrap?.society?.id ?? null,
        bootstrap_regular_admin_id: group.bootstrap?.regular_admin?.user_id ?? null,
      },
    });
    return res.status(201).json(group);
  } catch (error) {
    console.error('Error creating society group:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function updateSocietyGroup(req, res) {
  try {
    const group = await SocietyGroupService.updateSocietyGroup(
      Number(req.params.group_id),
      req.body,
      req.user
    );
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'SOCIETY_GROUP_UPDATED',
      entityType: 'SocietyGroup',
      entityId: group.id,
      metadata: {
        description: group.description,
      },
    });
    return res.status(200).json(group);
  } catch (error) {
    console.error('Error updating society group:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteSocietyGroup(req, res) {
  try {
    const deletedGroup = await SocietyGroupService.deleteSocietyGroup(
      Number(req.params.group_id),
      req.user
    );
    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'SOCIETY_GROUP_DELETED',
      entityType: 'SocietyGroup',
      entityId: deletedGroup.id,
      metadata: {
        description: deletedGroup.description,
      },
    });
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting society group:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function transferSocietyToGroup(req, res) {
  try {
    const sourceGroupId = Number(req.params.group_id);
    const societyId = Number(req.params.society_id);
    const targetGroupId = Number(req.body?.target_group_id);

    const result = await SocietyGroupService.transferSocietyToGroup(
      sourceGroupId,
      societyId,
      targetGroupId,
      req.user
    );

    await AuditLogService.recordAuditLogFromRequest(req, {
      actionType: 'SOCIETY_TRANSFERRED_TO_GROUP',
      entityType: 'Society',
      entityId: result.society?.id ?? societyId,
      metadata: {
        description: result.society?.description ?? null,
        from_group_id: result.from_group?.id ?? sourceGroupId,
        from_group_description: result.from_group?.description ?? null,
        to_group_id: result.to_group?.id ?? targetGroupId,
        to_group_description: result.to_group?.description ?? null,
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error transferring society to group:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export default {
  getSocietyGroups,
  getSocietyGroupById,
  createSocietyGroup,
  updateSocietyGroup,
  deleteSocietyGroup,
  transferSocietyToGroup
};