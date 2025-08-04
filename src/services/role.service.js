import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import Role from '../models/role.model.js';

/**
 * Create a role
 * @param {Object} roleBody
 * @returns {Promise<Role>}
 */
const createRole = async (roleBody) => {
  if (await Role.isNameTaken(roleBody.name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already taken');
  }
  return Role.create(roleBody);
};

/**
 * Query for roles
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryRoles = async (filter, options) => {
  if(filter.name) {
    filter.name = { $regex: filter.name, $options: 'i' };
  }
  const roles = await Role.paginate(filter, {
    ...options,
    populate: 'createdBy',
  });
  return roles;
};

/**
 * Get role by id
 * @param {ObjectId} id
 * @returns {Promise<Role>}
 */
const getRoleById = async (id) => {
  const role = await Role.findById(id).populate('createdBy branchAccess');
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
  return role;
};

/**
 * Get role by name
 * @param {string} name
 * @returns {Promise<Role>}
 */
const getRoleByName = async (name) => {
  const role = await Role.findOne({ name }).populate('createdBy branchAccess');
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
  return role;
};

/**
 * Update role by id
 * @param {ObjectId} roleId
 * @param {Object} updateBody
 * @returns {Promise<Role>}
 */
const updateRoleById = async (roleId, updateBody) => {
  const role = await getRoleById(roleId);
  if (updateBody.name && (await Role.isNameTaken(updateBody.name, roleId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already taken');
  }
  Object.assign(role, updateBody);
  await role.save();
  return role;
};

/**
 * Delete role by id
 * @param {ObjectId} roleId
 * @returns {Promise<Role>}
 */
const deleteRoleById = async (roleId) => {
  const role = await getRoleById(roleId);
  await role.remove();
  return role;
};

/**
 * Get all active roles
 * @returns {Promise<Role[]>}
 */
const getActiveRoles = async () => {
  const roles = await Role.find({ isActive: true }).populate('createdBy');
  return roles;
};

/**
 * Get all available permissions (both navigation and API)
 * @returns {Object}
 */
const getAvailablePermissions = () => {
  return {
    navigationPermissions: getAvailableNavigationPermissions(),
    apiPermissions: getAvailableApiPermissions(),
  };
};

/**
 * Get available navigation permissions with descriptions
 * @returns {Object}
 */
const getAvailableNavigationPermissions = () => {
  return {
    dashboard: {
      key: 'dashboard',
      title: 'Dashboard',
      description: 'Access to the main dashboard page',
      path: '/dashboard',
      category: 'main',
    },
    clients: {
      key: 'clients',
      title: 'Clients',
      description: 'Access to client management pages',
      path: '/clients',
      category: 'main',
    },
    groups: {
      key: 'groups',
      title: 'Groups',
      description: 'Access to group management pages',
      path: '/groups',
      category: 'main',
    },
    teams: {
      key: 'teams',
      title: 'Teams',
      description: 'Access to team management pages',
      path: '/teams',
      category: 'main',
    },
    timelines: {
      key: 'timelines',
      title: 'Timeline',
      description: 'Access to timeline and activity tracking',
      path: '/timelines',
      category: 'main',
    },
    analytics: {
      key: 'analytics',
      title: 'Analytics',
      description: 'Access to analytics and reporting',
      path: '/analytics',
      category: 'main',
    },
    fileManager: {
      key: 'fileManager',
      title: 'File Manager',
      description: 'Access to file management system',
      path: '/file-manager',
      category: 'main',
    },
    settings: {
      key: 'settings',
      title: 'Settings',
      description: 'Access to system settings',
      category: 'settings',
      children: {
        activities: {
          key: 'settings.activities',
          title: 'Activities',
          description: 'Manage system activities',
          path: '/activities',
          category: 'settings',
        },
        branches: {
          key: 'settings.branches',
          title: 'Branches',
          description: 'Manage branch locations',
          path: '/branches',
          category: 'settings',
        },
        users: {
          key: 'settings.users',
          title: 'Users',
          description: 'Manage system users',
          path: '/users',
          category: 'settings',
        },
        roles: {
          key: 'settings.roles',
          title: 'Roles',
          description: 'Manage user roles and permissions',
          path: '/roles',
          category: 'settings',
        },
      },
    },
  };
};

/**
 * Get available API permissions with descriptions
 * @returns {Object}
 */
const getAvailableApiPermissions = () => {
  return {
    // User Management
    getUsers: {
      key: 'getUsers',
      title: 'View Users',
      description: 'Can view user list and details',
      category: 'user_management',
      group: 'users',
    },
    manageUsers: {
      key: 'manageUsers',
      title: 'Manage Users',
      description: 'Can create, update, and delete users',
      category: 'user_management',
      group: 'users',
    },
    
    // Team Management
    getTeamMembers: {
      key: 'getTeamMembers',
      title: 'View Team Members',
      description: 'Can view team member list and details',
      category: 'team_management',
      group: 'teams',
    },
    manageTeamMembers: {
      key: 'manageTeamMembers',
      title: 'Manage Team Members',
      description: 'Can create, update, and delete team members',
      category: 'team_management',
      group: 'teams',
    },
    
    // Activity Management
    getActivities: {
      key: 'getActivities',
      title: 'View Activities',
      description: 'Can view activity list and details',
      category: 'activity_management',
      group: 'activities',
    },
    manageActivities: {
      key: 'manageActivities',
      title: 'Manage Activities',
      description: 'Can create, update, and delete activities',
      category: 'activity_management',
      group: 'activities',
    },
    
    // Branch Management
    getBranches: {
      key: 'getBranches',
      title: 'View Branches',
      description: 'Can view branch list and details',
      category: 'branch_management',
      group: 'branches',
    },
    manageBranches: {
      key: 'manageBranches',
      title: 'Manage Branches',
      description: 'Can create, update, and delete branches',
      category: 'branch_management',
      group: 'branches',
    },
    
    // Client Management
    getClients: {
      key: 'getClients',
      title: 'View Clients',
      description: 'Can view client list and details',
      category: 'client_management',
      group: 'clients',
    },
    manageClients: {
      key: 'manageClients',
      title: 'Manage Clients',
      description: 'Can create, update, and delete clients',
      category: 'client_management',
      group: 'clients',
    },
    
    // Group Management
    getGroups: {
      key: 'getGroups',
      title: 'View Groups',
      description: 'Can view group list and details',
      category: 'group_management',
      group: 'groups',
    },
    manageGroups: {
      key: 'manageGroups',
      title: 'Manage Groups',
      description: 'Can create, update, and delete groups',
      category: 'group_management',
      group: 'groups',
    },
    
    // Timeline Management
    getTimelines: {
      key: 'getTimelines',
      title: 'View Timelines',
      description: 'Can view timeline list and details',
      category: 'timeline_management',
      group: 'timelines',
    },
    manageTimelines: {
      key: 'manageTimelines',
      title: 'Manage Timelines',
      description: 'Can create, update, and delete timelines',
      category: 'timeline_management',
      group: 'timelines',
    },
    
    // Role Management
    getRoles: {
      key: 'getRoles',
      title: 'View Roles',
      description: 'Can view role list and details',
      category: 'role_management',
      group: 'roles',
    },
    manageRoles: {
      key: 'manageRoles',
      title: 'Manage Roles',
      description: 'Can create, update, and delete roles',
      category: 'role_management',
      group: 'roles',
    },
    
    // File Manager Management
    getFileManager: {
      key: 'getFileManager',
      title: 'View File Manager',
      description: 'Can view file manager and browse files',
      category: 'file_management',
      group: 'fileManager',
    },
    manageFileManager: {
      key: 'manageFileManager',
      title: 'Manage File Manager',
      description: 'Can upload, delete, and manage files',
      category: 'file_management',
      group: 'fileManager',
    },
  };
};

/**
 * Check if user has permission for a specific action
 * @param {Object} userRole - The user's role object
 * @param {string} permission - The permission to check
 * @returns {boolean}
 */
const hasPermission = (userRole, permission) => {
  if (!userRole || !userRole.apiPermissions) {
    return false;
  }
  return userRole.apiPermissions[permission] === true;
};

/**
 * Check if user has navigation access
 * @param {Object} userRole - The user's role object
 * @param {string} navigationPath - The navigation path to check
 * @returns {boolean}
 */
const hasNavigationAccess = (userRole, navigationPath) => {
  if (!userRole || !userRole.navigationPermissions) {
    return false;
  }

  // Handle nested settings permissions
  if (navigationPath.startsWith('settings.')) {
    const settingKey = navigationPath.split('.')[1];
    return userRole.navigationPermissions.settings?.[settingKey] === true;
  }

  return userRole.navigationPermissions[navigationPath] === true;
};

/**
 * Check if user has access to a specific branch
 * @param {Object} userRole - The user's role object
 * @param {ObjectId|string} branchId - The branch ID to check
 * @returns {boolean}
 */
const hasBranchAccess = (userRole, branchId) => {
  if (!userRole) {
    return false;
  }

  // If role has access to all branches
  if (userRole.allBranchesAccess) {
    return true;
  }

  // Check if branch is in the allowed branches array
  if (userRole.branchAccess && userRole.branchAccess.length > 0) {
    const branchIdStr = branchId.toString();
    return userRole.branchAccess.some(branch => {
      const branchIdToCheck = typeof branch === 'string' ? branch : branch._id || branch;
      return branchIdToCheck.toString() === branchIdStr;
    });
  }

  return false;
};

/**
 * Get all branch IDs that a user has access to
 * @param {Object} userRole - The user's role object
 * @returns {Array<string>} - Array of branch IDs as strings
 */
const getUserBranchIds = (userRole) => {
  if (!userRole) {
    return [];
  }

  // If role has access to all branches, return null to indicate no filtering needed
  if (userRole.allBranchesAccess) {
    return null;
  }

  // Return array of branch IDs
  if (userRole.branchAccess && userRole.branchAccess.length > 0) {
    return userRole.branchAccess.map(branch => {
      const branchId = typeof branch === 'string' ? branch : branch._id || branch;
      return branchId.toString();
    });
  }

  return [];
};

/**
 * Check if user has access to any of the provided branches
 * @param {Object} userRole - The user's role object
 * @param {Array<ObjectId|string>} branchIds - Array of branch IDs to check
 * @returns {boolean}
 */
const hasAnyBranchAccess = (userRole, branchIds) => {
  if (!userRole || !branchIds || branchIds.length === 0) {
    return false;
  }

  // If role has access to all branches
  if (userRole.allBranchesAccess) {
    return true;
  }

  // Check if any of the provided branches are in the allowed branches array
  if (userRole.branchAccess && userRole.branchAccess.length > 0) {
    const allowedBranchIds = userRole.branchAccess.map(branch => {
      const branchId = typeof branch === 'string' ? branch : branch._id || branch;
      return branchId.toString();
    });

    return branchIds.some(branchId => 
      allowedBranchIds.includes(branchId.toString())
    );
  }

  return false;
};

export {
  createRole,
  queryRoles,
  getRoleById,
  getRoleByName,
  updateRoleById,
  deleteRoleById,
  getActiveRoles,
  getAvailablePermissions,
  getAvailableNavigationPermissions,
  getAvailableApiPermissions,
  hasPermission,
  hasNavigationAccess,
  hasBranchAccess,
  getUserBranchIds,
  hasAnyBranchAccess,
}; 