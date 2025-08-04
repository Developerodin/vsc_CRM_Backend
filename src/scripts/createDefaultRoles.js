import mongoose from 'mongoose';
import config from '../config/config.js';
import logger from '../config/logger.js';
import Role from '../models/role.model.js';
import User from '../models/user.model.js';

const createDefaultRoles = async () => {
  try {
    // Create Superadmin role with ALL permissions
    const superadminRole = await Role.findOneAndUpdate(
      { name: 'superadmin' },
      {
        name: 'superadmin',
        description: 'Super Admin with complete system access',
        navigationPermissions: {
          dashboard: true,
          clients: true,
          groups: true,
          teams: true,
          timelines: true,
          analytics: true,
          fileManager: true,
          settings: {
            activities: true,
            branches: true,
            users: true,
            roles: true,
          },
        },
        apiPermissions: {
          getUsers: true,
          manageUsers: true,
          getTeamMembers: true,
          manageTeamMembers: true,
          getActivities: true,
          manageActivities: true,
          getBranches: true,
          manageBranches: true,
          getClients: true,
          manageClients: true,
          getGroups: true,
          manageGroups: true,
          getRoles: true,
          manageRoles: true,
          getFileManager: true,
          manageFileManager: true,
        },
        allBranchesAccess: true,
        isActive: true,
        createdBy: null,
      },
      { upsert: true, new: true }
    );

    // Create Admin role with all permissions
    const adminRole = await Role.findOneAndUpdate(
      { name: 'Admin' },
      {
        name: 'Admin',
        description: 'Full system administrator with all permissions',
        navigationPermissions: {
          dashboard: true,
          clients: true,
          groups: true,
          teams: true,
          timelines: true,
          analytics: true,
          fileManager: true,
          settings: {
            activities: true,
            branches: true,
            users: true,
            roles: true,
          },
        },
        apiPermissions: {
          getUsers: true,
          manageUsers: true,
          getTeamMembers: true,
          manageTeamMembers: true,
          getActivities: true,
          manageActivities: true,
          getBranches: true,
          manageBranches: true,
          getClients: true,
          manageClients: true,
          getGroups: true,
          manageGroups: true,
          getRoles: true,
          manageRoles: true,
          getFileManager: true,
          manageFileManager: true,
        },
        allBranchesAccess: true,
        isActive: true,
        createdBy: null, // Will be set to the first admin user
      },
      { upsert: true, new: true }
    );

    // Create User role with basic permissions
    const userRole = await Role.findOneAndUpdate(
      { name: 'User' },
      {
        name: 'User',
        description: 'Basic user with limited permissions',
        navigationPermissions: {
          dashboard: true,
          clients: true,
          groups: true,
          teams: true,
          timelines: true,
          analytics: false,
          fileManager: true,
          settings: {
            activities: false,
            branches: false,
            users: false,
            roles: false,
          },
        },
        apiPermissions: {
          getUsers: false,
          manageUsers: false,
          getTeamMembers: true,
          manageTeamMembers: false,
          getActivities: true,
          manageActivities: false,
          getBranches: true,
          manageBranches: false,
          getClients: true,
          manageClients: false,
          getGroups: true,
          manageGroups: false,
          getRoles: false,
          manageRoles: false,
          getFileManager: true,
          manageFileManager: false,
        },
        allBranchesAccess: false,
        isActive: true,
        createdBy: null,
      },
      { upsert: true, new: true }
    );

    // Create Manager role with moderate permissions
    const managerRole = await Role.findOneAndUpdate(
      { name: 'Manager' },
      {
        name: 'Manager',
        description: 'Manager with moderate permissions',
        navigationPermissions: {
          dashboard: true,
          clients: true,
          groups: true,
          teams: true,
          timelines: true,
          analytics: true,
          fileManager: true,
          settings: {
            activities: true,
            branches: true,
            users: false,
            roles: false,
          },
        },
        apiPermissions: {
          getUsers: false,
          manageUsers: false,
          getTeamMembers: true,
          manageTeamMembers: true,
          getActivities: true,
          manageActivities: true,
          getBranches: true,
          manageBranches: true,
          getClients: true,
          manageClients: true,
          getGroups: true,
          manageGroups: true,
          getRoles: false,
          manageRoles: false,
          getFileManager: true,
          manageFileManager: true,
        },
        allBranchesAccess: false,
        isActive: true,
        createdBy: null,
      },
      { upsert: true, new: true }
    );

    logger.info('Default roles created successfully');
    return { superadminRole, adminRole, userRole, managerRole };
  } catch (error) {
    logger.error('Error creating default roles:', error);
    throw error;
  }
};

const migrateExistingUsers = async () => {
  try {
    // Get all users without a role
    const usersWithoutRole = await User.find({ role: { $exists: false } });
    
    // Get the default user role
    const defaultRole = await Role.findOne({ name: 'User' });
    
    if (!defaultRole) {
      throw new Error('Default User role not found');
    }

    // Update users to have the default role
    const updatePromises = usersWithoutRole.map(user => 
      User.findByIdAndUpdate(user._id, { role: defaultRole._id })
    );

    await Promise.all(updatePromises);
    
    logger.info(`Migrated ${usersWithoutRole.length} users to default role`);
  } catch (error) {
    logger.error('Error migrating existing users:', error);
    throw error;
  }
};

const runMigration = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');

    await createDefaultRoles();
    await migrateExistingUsers();

    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { createDefaultRoles, migrateExistingUsers }; 