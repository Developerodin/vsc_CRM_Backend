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
 * Reparent a client folder under the correct branch Clients root when needed.
 * @param {Object} clientFolder - Existing client folder document
 * @param {Object} clientsRoot - Branch Clients root folder
 * @param {Object} client - Client document fields
 * @returns {Promise<Object>} Updated client folder
 */
const reparentClientFolderIfNeeded = async (clientFolder, clientsRoot, client) => {
  const clientId = client._id;
  const clientName = client.name || `Client ${clientId}`;
  const branchId = client.branch?._id || client.branch;
  const branchObjectId = new mongoose.Types.ObjectId(branchId);
  const correctParentId = clientsRoot._id.toString();
  const currentParentId = clientFolder.folder.parentFolder?.toString();

  if (currentParentId === correctParentId) {
    if (!clientFolder.folder.metadata?.branchId) {
      clientFolder.folder.metadata = {
        ...(clientFolder.folder.metadata || {}),
        clientId,
        clientName,
        branchId: branchObjectId,
      };
      await clientFolder.save();
    }
    return clientFolder;
  }

  clientFolder.folder.parentFolder = clientsRoot._id;
  clientFolder.folder.path = `${clientsRoot.folder.path}/${clientFolder.folder.name || clientName}`;
  clientFolder.folder.metadata = {
    ...(clientFolder.folder.metadata || {}),
    clientId,
    clientName,
    branchId: branchObjectId,
  };
  await clientFolder.save();
  return clientFolder;
};

/**
 * Count direct child items for a folder.
 * @param {mongoose.Types.ObjectId} folderId - Folder id
 * @returns {Promise<number>} Child item count
 */
const countFolderChildren = async (folderId) => {
  return FileManager.countDocuments({
    isDeleted: false,
    $or: [
      { 'folder.parentFolder': folderId },
      { 'file.parentFolder': folderId },
    ],
  });
};

/**
 * Find all candidate folders that may represent a client.
 * @param {Object} client - Client document
 * @returns {Promise<Array<Object>>} Candidate folder documents
 */
const findClientFolderCandidates = async (client) => {
  const clientId = new mongoose.Types.ObjectId(client._id);
  const clientName = client.name || `Client ${client._id}`;

  const byClientId = await FileManager.find({
    type: 'folder',
    'folder.metadata.clientId': clientId,
    isDeleted: false,
  });

  const clientsRoots = await FileManager.find({
    type: 'folder',
    'folder.name': 'Clients',
    'folder.isRoot': true,
    isDeleted: false,
  });

  const byName = clientsRoots.length
    ? await FileManager.find({
        type: 'folder',
        'folder.name': clientName,
        'folder.parentFolder': { $in: clientsRoots.map((root) => root._id) },
        isDeleted: false,
      })
    : [];

  const merged = new Map();
  [...byClientId, ...byName].forEach((folder) => {
    merged.set(folder._id.toString(), folder);
  });

  return Array.from(merged.values());
};

/**
 * Pick the best existing client folder, preferring folders that already contain files.
 * @param {Array<Object>} candidates - Candidate folder documents
 * @returns {Promise<Object|null>} Best folder or null
 */
const pickBestClientFolder = async (candidates) => {
  if (!candidates.length) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  let bestFolder = candidates[0];
  let bestScore = await countFolderChildren(bestFolder._id);

  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const score = await countFolderChildren(candidate._id);
    if (score > bestScore) {
      bestFolder = candidate;
      bestScore = score;
    }
  }

  return bestFolder;
};

/**
 * Soft-delete empty duplicate client folders after choosing a canonical folder.
 * @param {Array<Object>} candidates - Candidate folders
 * @param {Object} canonicalFolder - Folder to keep
 * @returns {Promise<number>} Number of duplicates removed
 */
const removeEmptyDuplicateClientFolders = async (candidates, canonicalFolder) => {
  let removed = 0;

  for (const candidate of candidates) {
    if (candidate._id.toString() === canonicalFolder._id.toString()) {
      continue;
    }

    const childCount = await countFolderChildren(candidate._id);
    if (childCount === 0) {
      candidate.isDeleted = true;
      await candidate.save();
      removed += 1;
    }
  }

  return removed;
};

/**
 * Sync all client folders for a single branch under its Clients root.
 * @param {mongoose.Types.ObjectId|string} branchId - Branch identifier
 * @returns {Promise<number>} Number of clients synced
 */
const syncBranchClientFolders = async (branchId) => {
  const clients = await Client.find({ branch: branchId }).select('_id name branch');
  await Promise.all(clients.map((client) => ensureClientFolderForClient(client)));
  return clients.length;
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

  const clientsRoot = await getClientsRootForBranch(branchId, createdByUserId || branchId);
  const createdBy = createdByUserId
    ? new mongoose.Types.ObjectId(createdByUserId)
    : new mongoose.Types.ObjectId(branchId);
  const branchObjectId = new mongoose.Types.ObjectId(branchId);

  const candidates = await findClientFolderCandidates(client);
  const bestFolder = await pickBestClientFolder(candidates);

  if (bestFolder) {
    const canonical = await reparentClientFolderIfNeeded(bestFolder, clientsRoot, client);
    await removeEmptyDuplicateClientFolders(candidates, canonical);
    return canonical;
  }

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
        branchId: branchObjectId,
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
        branchId: branchObjectId,
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
    clientFoldersReparented: 0,
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
      const clientsRoot = await getClientsRootForBranch(client.branch);
      const beforeParent = await FileManager.findOne({
        type: 'folder',
        'folder.metadata.clientId': client._id,
        isDeleted: false,
      });

      const folder = await ensureClientFolderForClient(client);
      summary.clientFoldersEnsured += 1;

      if (
        beforeParent &&
        beforeParent.folder.parentFolder?.toString() !== clientsRoot._id.toString() &&
        folder.folder.parentFolder?.toString() === clientsRoot._id.toString()
      ) {
        summary.clientFoldersReparented += 1;
      }
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
  syncBranchClientFolders,
  backfillAllBranchFileManagerFolders,
};
