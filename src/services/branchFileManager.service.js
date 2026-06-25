import mongoose from 'mongoose';
import FileManager from '../models/fileManager.model.js';
import Client from '../models/client.model.js';
import { Branch } from '../models/index.js';
import { getUserBranchIds } from './role.service.js';

const ROOT_FOLDER_NAMES = ['Documents', 'Clients'];

/**
 * Resolve branch IDs a user can access in the file manager.
 * @param {Object} user - Authenticated user with role / assignedBranch
 * @returns {string[]} Branch id strings; empty when user uses legacy personal scope
 */
const getFileManagerBranchIds = (user) => {
  if (!user) {
    return [];
  }

  if (user.assignedBranch) {
    const branchId = user.assignedBranch._id || user.assignedBranch;
    return branchId ? [branchId.toString()] : [];
  }

  if (user.role?.allBranchesAccess) {
    return [];
  }

  const branchIds = getUserBranchIds(user.role);
  return branchIds || [];
};

/**
 * Ensure Documents and Clients root folders exist for a branch.
 * @param {mongoose.Types.ObjectId|string} branchId - Branch identifier
 * @param {mongoose.Types.ObjectId|string} [createdByUserId] - User id stored on folder.createdBy
 * @returns {Promise<{ documents: Object, clients: Object }>}
 */
const ensureBranchRootFolders = async (branchId, createdByUserId = null) => {
  const branchObjectId = new mongoose.Types.ObjectId(branchId);
  const createdBy = createdByUserId
    ? new mongoose.Types.ObjectId(createdByUserId)
    : branchObjectId;

  const folders = {};

  for (const name of ROOT_FOLDER_NAMES) {
    let folder = await FileManager.findOne({
      type: 'folder',
      'folder.name': name,
      'folder.isRoot': true,
      'folder.metadata.branchId': branchObjectId,
      isDeleted: false,
    });

    if (!folder) {
      const legacyFolder = await FileManager.findOne({
        type: 'folder',
        'folder.name': name,
        'folder.isRoot': true,
        'folder.createdBy': branchObjectId,
        isDeleted: false,
        $or: [
          { 'folder.metadata.branchId': { $exists: false } },
          { 'folder.metadata.branchId': null },
        ],
      });

      if (legacyFolder) {
        legacyFolder.folder.metadata = {
          ...(legacyFolder.folder.metadata || {}),
          branchId: branchObjectId,
        };
        await legacyFolder.save();
        folder = legacyFolder;
      } else {
        folder = await FileManager.create({
          type: 'folder',
          folder: {
            name,
            description:
              name === 'Clients'
                ? 'Parent folder for all client subfolders'
                : 'Branch documents folder',
            parentFolder: null,
            createdBy,
            isRoot: true,
            path: `/${name}`,
            metadata: { branchId: branchObjectId },
          },
        });
      }
    }

    folders[name.toLowerCase()] = folder;
  }

  return folders;
};

/**
 * Ensure root folders exist for every branch the user can access.
 * @param {Object} user - Authenticated user
 * @returns {Promise<void>}
 */
const ensureRootFoldersForUser = async (user) => {
  const branchIds = getFileManagerBranchIds(user);

  if (branchIds.length === 0) {
    return;
  }

  const userId = user.id || user._id;
  await Promise.all(
    branchIds.map((branchId) => ensureBranchRootFolders(branchId, userId))
  );
};

/**
 * Build Mongo filter for root folders visible to a user.
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} Mongo filter
 */
const buildRootFolderFilterForUser = async (user) => {
  await ensureRootFoldersForUser(user);

  const branchIds = getFileManagerBranchIds(user);
  const userId = user.id || user._id;

  if (branchIds.length > 0) {
    return {
      type: 'folder',
      'folder.isRoot': true,
      isDeleted: false,
      'folder.metadata.branchId': {
        $in: branchIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    };
  }

  return {
    type: 'folder',
    'folder.isRoot': true,
    isDeleted: false,
    $or: [
      { 'folder.createdBy': userId },
      {
        'folder.metadata.branchId': { $exists: false },
        'folder.createdBy': userId,
      },
    ],
  };
};

/**
 * Get branch-scoped Clients root folder, creating branch roots if needed.
 * @param {mongoose.Types.ObjectId|string} branchId - Branch identifier
 * @param {mongoose.Types.ObjectId|string} [createdByUserId] - User id for createdBy
 * @returns {Promise<Object>} Clients root folder document
 */
const getClientsRootForBranch = async (branchId, createdByUserId = null) => {
  const { clients } = await ensureBranchRootFolders(branchId, createdByUserId);
  return clients;
};

/**
 * Ensure a client subfolder exists under the branch Clients root.
 * @param {Object} client - Client mongoose document
 * @param {mongoose.Types.ObjectId|string} [createdByUserId] - User performing the action
 * @returns {Promise<Object>} Client folder document
 */
const ensureClientFolderForClient = async (client, createdByUserId = null) => {
  const clientId = client._id;
  const clientName = client.name || `Client ${clientId}`;
  const branchId = client.branch?._id || client.branch;

  if (!branchId) {
    throw new Error(`Client ${clientId} has no branch assigned`);
  }

  let clientFolder = await FileManager.findOne({
    type: 'folder',
    'folder.metadata.clientId': new mongoose.Types.ObjectId(clientId),
    isDeleted: false,
  });

  if (clientFolder) {
    return clientFolder;
  }

  const clientsRoot = await getClientsRootForBranch(branchId, createdByUserId || branchId);
  const createdBy = createdByUserId
    ? new mongoose.Types.ObjectId(createdByUserId)
    : new mongoose.Types.ObjectId(branchId);

  const existingByName = await FileManager.findOne({
    type: 'folder',
    'folder.name': clientName,
    'folder.parentFolder': clientsRoot._id,
    isDeleted: false,
  });

  if (existingByName) {
    if (!existingByName.folder.metadata?.clientId) {
      existingByName.folder.metadata = {
        ...(existingByName.folder.metadata || {}),
        clientId,
        clientName,
        branchId: new mongoose.Types.ObjectId(branchId),
      };
      await existingByName.save();
    }
    return existingByName;
  }

  clientFolder = await FileManager.create({
    type: 'folder',
    folder: {
      name: clientName,
      description: `Folder for client: ${clientName}`,
      parentFolder: clientsRoot._id,
      createdBy,
      isRoot: false,
      path: `${clientsRoot.folder.path}/${clientName}`,
      metadata: {
        clientId,
        clientName,
        branchId: new mongoose.Types.ObjectId(branchId),
      },
    },
  });

  return clientFolder;
};

/**
 * Backfill branch root folders and missing client folders for all branches.
 * @returns {Promise<Object>} Backfill summary
 */
const backfillAllBranchFileManagerFolders = async () => {
  const summary = {
    branchesProcessed: 0,
    rootFoldersEnsured: 0,
    clientFoldersEnsured: 0,
    errors: [],
  };

  const branches = await Branch.find({});
  for (const branch of branches) {
    try {
      await ensureBranchRootFolders(branch._id);
      summary.branchesProcessed += 1;
      summary.rootFoldersEnsured += ROOT_FOLDER_NAMES.length;
    } catch (error) {
      summary.errors.push({
        branchId: branch._id.toString(),
        branchName: branch.name,
        error: error.message,
      });
    }
  }

  const clients = await Client.find({}).select('_id name branch');
  for (const client of clients) {
    try {
      await ensureClientFolderForClient(client);
      summary.clientFoldersEnsured += 1;
    } catch (error) {
      summary.errors.push({
        clientId: client._id.toString(),
        clientName: client.name,
        error: error.message,
      });
    }
  }

  return summary;
};

export {
  getFileManagerBranchIds,
  ensureBranchRootFolders,
  ensureRootFoldersForUser,
  buildRootFolderFilterForUser,
  getClientsRootForBranch,
  ensureClientFolderForClient,
  backfillAllBranchFileManagerFolders,
};
