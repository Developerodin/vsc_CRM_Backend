import * as roleService from '../services/role.service.js';

// Get available API permissions dynamically
const availableApiPermissions = roleService.getAvailableApiPermissions();
const availablePermissionKeys = Object.keys(availableApiPermissions);

const allRoles = {
  user: ['getTeamMembers', 'manageTeamMembers', 'getActivities', 'manageActivities', 'getBranches', 'manageBranches'],
  admin: availablePermissionKeys, // Admin gets all available permissions
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

export { roles, roleRights };
