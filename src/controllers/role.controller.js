import httpStatus from 'http-status';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import * as roleService from '../services/role.service.js';

const createRole = catchAsync(async (req, res) => {
  let roleBody = {
    ...req.body,
    createdBy: req.user?.id || null,
  };

  // Handle permissions array if it exists (old format)
  if (req.body.permissions && Array.isArray(req.body.permissions)) {
    const permissionsArray = req.body.permissions;
    
    // Initialize permission objects
    const navigationPermissions = {
      dashboard: false,
      clients: false,
      groups: false,
      teams: false,
      timelines: false,
      analytics: false,
      settings: {
        activities: false,
        branches: false,
        users: false,
        roles: false,
      },
    };

    const apiPermissions = {
      getUsers: false,
      manageUsers: false,
      getTeamMembers: false,
      manageTeamMembers: false,
      getActivities: false,
      manageActivities: false,
      getBranches: false,
      manageBranches: false,
      getClients: false,
      manageClients: false,
      getGroups: false,
      manageGroups: false,
      getRoles: false,
      manageRoles: false,
    };

    // Set permissions to true based on the array
    permissionsArray.forEach(permission => {
      // Handle navigation permissions
      if (navigationPermissions.hasOwnProperty(permission)) {
        navigationPermissions[permission] = true;
      }
      // Handle settings permissions
      else if (permission.startsWith('settings.')) {
        const settingKey = permission.split('.')[1];
        if (navigationPermissions.settings.hasOwnProperty(settingKey)) {
          navigationPermissions.settings[settingKey] = true;
        }
      }
      // Handle API permissions
      else if (apiPermissions.hasOwnProperty(permission)) {
        apiPermissions[permission] = true;
      }
    });

    roleBody = {
      ...roleBody,
      navigationPermissions,
      apiPermissions,
    };
    
    // Remove the permissions array as it's not part of the model
    delete roleBody.permissions;
  }
  // Handle direct navigationPermissions and apiPermissions (new format)
  else if (req.body.navigationPermissions || req.body.apiPermissions) {
    // Ensure navigationPermissions has the correct structure
    if (req.body.navigationPermissions) {
      const navPerms = req.body.navigationPermissions;
      roleBody.navigationPermissions = {
        dashboard: navPerms.dashboard || false,
        clients: navPerms.clients || false,
        groups: navPerms.groups || false,
        teams: navPerms.teams || false,
        timelines: navPerms.timelines || false,
        analytics: navPerms.analytics || false,
        settings: {
          activities: (navPerms.settings && typeof navPerms.settings === 'object') ? (navPerms.settings.activities || false) : false,
          branches: (navPerms.settings && typeof navPerms.settings === 'object') ? (navPerms.settings.branches || false) : false,
          users: (navPerms.settings && typeof navPerms.settings === 'object') ? (navPerms.settings.users || false) : false,
          roles: (navPerms.settings && typeof navPerms.settings === 'object') ? (navPerms.settings.roles || false) : false,
        },
      };
    }

    // Ensure apiPermissions has the correct structure
    if (req.body.apiPermissions) {
      const apiPerms = req.body.apiPermissions;
      roleBody.apiPermissions = {
        getUsers: apiPerms.getUsers || false,
        manageUsers: apiPerms.manageUsers || false,
        getTeamMembers: apiPerms.getTeamMembers || false,
        manageTeamMembers: apiPerms.manageTeamMembers || false,
        getActivities: apiPerms.getActivities || false,
        manageActivities: apiPerms.manageActivities || false,
        getBranches: apiPerms.getBranches || false,
        manageBranches: apiPerms.manageBranches || false,
        getClients: apiPerms.getClients || false,
        manageClients: apiPerms.manageClients || false,
        getGroups: apiPerms.getGroups || false,
        manageGroups: apiPerms.manageGroups || false,
        getRoles: apiPerms.getRoles || false,
        manageRoles: apiPerms.manageRoles || false,
      };
    }
  }

  const role = await roleService.createRole(roleBody);
  res.status(httpStatus.CREATED).send(role);
});

const getRoles = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'isActive']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await roleService.queryRoles(filter, options);
  res.send(result);
});

const getRole = catchAsync(async (req, res) => {
  const role = await roleService.getRoleById(req.params.roleId);
  res.send(role);
});

const updateRole = catchAsync(async (req, res) => {
  let updateBody = { ...req.body };

  // Handle permissions array if it exists (old format)
  if (req.body.permissions && Array.isArray(req.body.permissions)) {
    const permissionsArray = req.body.permissions;
    
    // Initialize permission objects
    const navigationPermissions = {
      dashboard: false,
      clients: false,
      groups: false,
      teams: false,
      timelines: false,
      analytics: false,
      settings: {
        activities: false,
        branches: false,
        users: false,
        roles: false,
      },
    };

    const apiPermissions = {
      getUsers: false,
      manageUsers: false,
      getTeamMembers: false,
      manageTeamMembers: false,
      getActivities: false,
      manageActivities: false,
      getBranches: false,
      manageBranches: false,
      getClients: false,
      manageClients: false,
      getGroups: false,
      manageGroups: false,
      getRoles: false,
      manageRoles: false,
    };

    // Set permissions to true based on the array
    permissionsArray.forEach(permission => {
      // Handle navigation permissions
      if (navigationPermissions.hasOwnProperty(permission)) {
        navigationPermissions[permission] = true;
      }
      // Handle settings permissions
      else if (permission.startsWith('settings.')) {
        const settingKey = permission.split('.')[1];
        if (navigationPermissions.settings.hasOwnProperty(settingKey)) {
          navigationPermissions.settings[settingKey] = true;
        }
      }
      // Handle API permissions
      else if (apiPermissions.hasOwnProperty(permission)) {
        apiPermissions[permission] = true;
      }
    });

    updateBody = {
      ...updateBody,
      navigationPermissions,
      apiPermissions,
    };
    
    // Remove the permissions array as it's not part of the model
    delete updateBody.permissions;
  }
  // Handle direct navigationPermissions and apiPermissions (new format)
  else if (req.body.navigationPermissions || req.body.apiPermissions) {
    // Ensure navigationPermissions has the correct structure
    if (req.body.navigationPermissions) {
      const navPerms = req.body.navigationPermissions;
      updateBody.navigationPermissions = {
        dashboard: navPerms.dashboard || false,
        clients: navPerms.clients || false,
        groups: navPerms.groups || false,
        teams: navPerms.teams || false,
        timelines: navPerms.timelines || false,
        analytics: navPerms.analytics || false,
        settings: {
          activities: (navPerms.settings && typeof navPerms.settings === 'object') ? (navPerms.settings.activities || false) : false,
          branches: (navPerms.settings && typeof navPerms.settings === 'object') ? (navPerms.settings.branches || false) : false,
          users: (navPerms.settings && typeof navPerms.settings === 'object') ? (navPerms.settings.users || false) : false,
          roles: (navPerms.settings && typeof navPerms.settings === 'object') ? (navPerms.settings.roles || false) : false,
        },
      };
    }

    // Ensure apiPermissions has the correct structure
    if (req.body.apiPermissions) {
      const apiPerms = req.body.apiPermissions;
      updateBody.apiPermissions = {
        getUsers: apiPerms.getUsers || false,
        manageUsers: apiPerms.manageUsers || false,
        getTeamMembers: apiPerms.getTeamMembers || false,
        manageTeamMembers: apiPerms.manageTeamMembers || false,
        getActivities: apiPerms.getActivities || false,
        manageActivities: apiPerms.manageActivities || false,
        getBranches: apiPerms.getBranches || false,
        manageBranches: apiPerms.manageBranches || false,
        getClients: apiPerms.getClients || false,
        manageClients: apiPerms.manageClients || false,
        getGroups: apiPerms.getGroups || false,
        manageGroups: apiPerms.manageGroups || false,
        getRoles: apiPerms.getRoles || false,
        manageRoles: apiPerms.manageRoles || false,
      };
    }
  }

  const role = await roleService.updateRoleById(req.params.roleId, updateBody);
  res.send(role);
});

const deleteRole = catchAsync(async (req, res) => {
  await roleService.deleteRoleById(req.params.roleId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getActiveRoles = catchAsync(async (req, res) => {
  const roles = await roleService.getActiveRoles();
  res.send(roles);
});

const getUserPermissions = catchAsync(async (req, res) => {
  // Get user's role with populated data
  const user = await req.user.populate('role');
  
  if (!user.role) {
    res.send({
      apiPermissions: {},
      navigationPermissions: {},
      branchAccess: [],
      allBranchesAccess: false,
    });
    return;
  }

  // Get branch access details
  const roleWithBranches = await roleService.getRoleById(user.role._id);
  
  res.send({
    apiPermissions: roleWithBranches.apiPermissions,
    navigationPermissions: roleWithBranches.navigationPermissions,
    branchAccess: roleWithBranches.branchAccess,
    allBranchesAccess: roleWithBranches.allBranchesAccess,
  });
});

const getAvailablePermissions = catchAsync(async (req, res) => {
  const permissions = roleService.getAvailablePermissions();
  res.send(permissions);
});

const getAvailableNavigationPermissions = catchAsync(async (req, res) => {
  const navigationPermissions = roleService.getAvailableNavigationPermissions();
  res.send(navigationPermissions);
});

const getAvailableApiPermissions = catchAsync(async (req, res) => {
  const apiPermissions = roleService.getAvailableApiPermissions();
  res.send(apiPermissions);
});

export {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  getActiveRoles,
  getUserPermissions,
  getAvailablePermissions,
  getAvailableNavigationPermissions,
  getAvailableApiPermissions,
}; 