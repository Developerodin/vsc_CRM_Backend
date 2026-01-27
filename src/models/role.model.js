import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const roleSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Frontend navigation permissions
    navigationPermissions: {
      dashboard: { type: Boolean, default: false },
      clients: { type: Boolean, default: false },
      groups: { type: Boolean, default: false },
      teams: { type: Boolean, default: false },
      timelines: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      fileManager: { type: Boolean, default: false },
      settings: {
        activities: { type: Boolean, default: false },
        branches: { type: Boolean, default: false },
        users: { type: Boolean, default: false },
        roles: { type: Boolean, default: false },
      },
    },
    // Backend API permissions
    apiPermissions: {
      // User permissions
      getUsers: { type: Boolean, default: false },
      manageUsers: { type: Boolean, default: false },
      // Team member permissions
      getTeamMembers: { type: Boolean, default: false },
      manageTeamMembers: { type: Boolean, default: false },
      // Activity permissions
      getActivities: { type: Boolean, default: false },
      manageActivities: { type: Boolean, default: false },
      // Branch permissions
      getBranches: { type: Boolean, default: false },
      manageBranches: { type: Boolean, default: false },
      // Client permissions
      getClients: { type: Boolean, default: false },
      manageClients: { type: Boolean, default: false },
      // Group permissions
      getGroups: { type: Boolean, default: false },
      manageGroups: { type: Boolean, default: false },
      // Timeline permissions
      getTimelines: { type: Boolean, default: false },
      manageTimelines: { type: Boolean, default: false },
      // Role permissions
      getRoles: { type: Boolean, default: false },
      manageRoles: { type: Boolean, default: false },
      // File Manager permissions
      getFileManager: { type: Boolean, default: false },
      manageFileManager: { type: Boolean, default: false },
      // Email / bulk email
      sendEmails: { type: Boolean, default: false },
    },
    // Branch access - array of branch IDs this role can access
    branchAccess: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    }],
    // Whether this role can access all branches
    allBranchesAccess: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
roleSchema.plugin(toJSON);
roleSchema.plugin(paginate);

/**
 * Check if role name is taken
 * @param {string} name - The role's name
 * @param {ObjectId} [excludeRoleId] - The id of the role to be excluded
 * @returns {Promise<boolean>}
 */
roleSchema.statics.isNameTaken = async function (name, excludeRoleId) {
  const role = await this.findOne({ name, _id: { $ne: excludeRoleId } });
  return !!role;
};

/**
 * @typedef Role
 */
const Role = mongoose.model('Role', roleSchema);

export default Role; 