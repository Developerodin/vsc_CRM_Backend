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
    
    // Get available permissions dynamically
    const availableNavigationPermissions = roleService.getAvailableNavigationPermissions();
    const availableApiPermissions = roleService.getAvailableApiPermissions();
    
    // Initialize permission objects with all available permissions set to false
    const navigationPermissions = {};
    const apiPermissions = {};
    
    // Initialize navigation permissions
    Object.keys(availableNavigationPermissions).forEach(key => {
      if (key === 'settings') {
        navigationPermissions[key] = {};
        Object.keys(availableNavigationPermissions[key].children || {}).forEach(childKey => {
          navigationPermissions[key][childKey] = false;
        });
      } else {
        navigationPermissions[key] = false;
      }
    });
    
    // Initialize API permissions
    Object.keys(availableApiPermissions).forEach(key => {
      apiPermissions[key] = false;
    });

    // Set permissions to true based on the array
    permissionsArray.forEach(permission => {
      // Handle navigation permissions
      if (navigationPermissions.hasOwnProperty(permission)) {
        navigationPermissions[permission] = true;
      }
      // Handle settings permissions
      else if (permission.startsWith('settings.')) {
        const settingKey = permission.split('.')[1];
        if (navigationPermissions.settings && navigationPermissions.settings.hasOwnProperty(settingKey)) {
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
    // Get available permissions dynamically
    const availableNavigationPermissions = roleService.getAvailableNavigationPermissions();
    const availableApiPermissions = roleService.getAvailableApiPermissions();
    
    // Ensure navigationPermissions has the correct structure
    if (req.body.navigationPermissions) {
      const navPerms = req.body.navigationPermissions;
      roleBody.navigationPermissions = {};
      
      // Set all available navigation permissions
      Object.keys(availableNavigationPermissions).forEach(key => {
        if (key === 'settings') {
          roleBody.navigationPermissions[key] = {};
          Object.keys(availableNavigationPermissions[key].children || {}).forEach(childKey => {
            roleBody.navigationPermissions[key][childKey] = 
              (navPerms.settings && typeof navPerms.settings === 'object') ? 
              (navPerms.settings[childKey] || false) : false;
          });
        } else {
          roleBody.navigationPermissions[key] = navPerms[key] || false;
        }
      });
    }

    // Ensure apiPermissions has the correct structure
    if (req.body.apiPermissions) {
      const apiPerms = req.body.apiPermissions;
      roleBody.apiPermissions = {};
      
      // Set all available API permissions
      Object.keys(availableApiPermissions).forEach(key => {
        roleBody.apiPermissions[key] = apiPerms[key] || false;
      });
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
    
    // Get available permissions dynamically
    const availableNavigationPermissions = roleService.getAvailableNavigationPermissions();
    const availableApiPermissions = roleService.getAvailableApiPermissions();
    
    // Initialize permission objects with all available permissions set to false
    const navigationPermissions = {};
    const apiPermissions = {};
    
    // Initialize navigation permissions
    Object.keys(availableNavigationPermissions).forEach(key => {
      if (key === 'settings') {
        navigationPermissions[key] = {};
        Object.keys(availableNavigationPermissions[key].children || {}).forEach(childKey => {
          navigationPermissions[key][childKey] = false;
        });
      } else {
        navigationPermissions[key] = false;
      }
    });
    
    // Initialize API permissions
    Object.keys(availableApiPermissions).forEach(key => {
      apiPermissions[key] = false;
    });

    // Set permissions to true based on the array
    permissionsArray.forEach(permission => {
      // Handle navigation permissions
      if (navigationPermissions.hasOwnProperty(permission)) {
        navigationPermissions[permission] = true;
      }
      // Handle settings permissions
      else if (permission.startsWith('settings.')) {
        const settingKey = permission.split('.')[1];
        if (navigationPermissions.settings && navigationPermissions.settings.hasOwnProperty(settingKey)) {
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
    // Get available permissions dynamically
    const availableNavigationPermissions = roleService.getAvailableNavigationPermissions();
    const availableApiPermissions = roleService.getAvailableApiPermissions();
    
    // Ensure navigationPermissions has the correct structure
    if (req.body.navigationPermissions) {
      const navPerms = req.body.navigationPermissions;
      updateBody.navigationPermissions = {};
      
      // Set all available navigation permissions
      Object.keys(availableNavigationPermissions).forEach(key => {
        if (key === 'settings') {
          updateBody.navigationPermissions[key] = {};
          Object.keys(availableNavigationPermissions[key].children || {}).forEach(childKey => {
            updateBody.navigationPermissions[key][childKey] = 
              (navPerms.settings && typeof navPerms.settings === 'object') ? 
              (navPerms.settings[childKey] || false) : false;
          });
        } else {
          updateBody.navigationPermissions[key] = navPerms[key] || false;
        }
      });
    }

    // Ensure apiPermissions has the correct structure
    if (req.body.apiPermissions) {
      const apiPerms = req.body.apiPermissions;
      updateBody.apiPermissions = {};
      
      // Set all available API permissions
      Object.keys(availableApiPermissions).forEach(key => {
        updateBody.apiPermissions[key] = apiPerms[key] || false;
      });
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