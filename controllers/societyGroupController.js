/**
 * Society Group Controller
 *
 * HTTP handlers for society group management and administration.
 */

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
      req.user.user_id
    );
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
    return res.status(200).json(group);
  } catch (error) {
    console.error('Error updating society group:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteSocietyGroup(req, res) {
  try {
    await SocietyGroupService.deleteSocietyGroup(
      Number(req.params.group_id),
      req.user
    );
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting society group:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
}

export default {
  getSocietyGroups,
  getSocietyGroupById,
  createSocietyGroup,
  updateSocietyGroup,
  deleteSocietyGroup
};