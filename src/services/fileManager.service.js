import mongoose from 'mongoose';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import FileManager from '../models/fileManager.model.js';
import Client from '../models/client.model.js';
import { deleteFileFromS3 } from '../controllers/common.controller.js';

/**
 * Create a folder
 * @param {Object} folderBody
 * @returns {Promise<FileManager>}
 */
const createFolder = async (folderBody) => {
  const { name, parentFolder, createdBy, description, metadata } = folderBody;
  
  // Check if folder name already exists in the same parent
  const isNameTaken = await FileManager.isFolderNameTaken(name, parentFolder);
  if (isNameTaken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Folder name already exists in this location');
  }

  // Build path
  let path = name;
  if (parentFolder) {
    const parent = await FileManager.findById(parentFolder);
    if (!parent || parent.type !== 'folder') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Parent folder not found');
    }
    path = parent.folder.path + '/' + name;
  }

  const folder = await FileManager.create({
    type: 'folder',
    folder: {
      name,
      description,
      parentFolder,
      createdBy,
      isRoot: !parentFolder,
      path,
      metadata: metadata || {},
    },
  });

  return folder;
};

/**
 * Create a file
 * @param {Object} fileBody
 * @returns {Promise<FileManager>}
 */
const createFile = async (fileBody) => {
  const { fileName, fileUrl, fileKey, parentFolder, uploadedBy, fileSize, mimeType, metadata } = fileBody;

  // Check if file name already exists in the same folder
  const isNameTaken = await FileManager.isFileNameTaken(fileName, parentFolder);
  if (isNameTaken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File name already exists in this folder');
  }

  // Get parent folder path
  let path = '';
  if (parentFolder) {
    const parent = await FileManager.findById(parentFolder);
    if (!parent || parent.type !== 'folder') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Parent folder not found');
    }
    path = parent.folder.path;
  }

  const file = await FileManager.create({
    type: 'file',
    file: {
      fileName,
      fileUrl,
      fileKey,
      fileSize: fileSize || 0,
      mimeType,
      metadata: metadata || {},
      uploadedBy,
      parentFolder, // Add parentFolder to file schema
    },
  });

  return file;
};

/**
 * Get folder by id
 * @param {ObjectId} id
 * @returns {Promise<FileManager>}
 */
const getFolderById = async (id) => {
  const folder = await FileManager.findOne({
    _id: id,
    type: 'folder',
    isDeleted: false,
  }).populate('folder.createdBy', 'name email');
  
  if (!folder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Folder not found');
  }
  
  return folder;
};

/**
 * Get file by id
 * @param {ObjectId} id
 * @returns {Promise<FileManager>}
 */
const getFileById = async (id) => {
  const file = await FileManager.findOne({
    _id: id,
    type: 'file',
    isDeleted: false,
  }).populate('file.uploadedBy', 'name email');
  
  if (!file) {
    throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
  }
  
  return file;
};

/**
 * Get folder contents (subfolders and files)
 * @param {ObjectId} folderId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const getFolderContents = async (folderId, options = {}) => {
  const folder = await getFolderById(folderId);
  
  // First, let's test a direct query to see what's in the database

  const directQuery = await FileManager.findOne({ 
    type: 'file', 
    'file.parentFolder': folderId,
    isDeleted: false 
  });

  const filter = {
    $or: [
      { 'folder.parentFolder': folderId },
      { 'file.parentFolder': folderId }
    ],
    isDeleted: false,
  };

  // Try a direct query instead of paginate to debug the issue

  const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
  const limit = hasLimit ? parseInt(options.limit, 10) : null;
  const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const skip = hasLimit ? (page - 1) * limit : 0;
  
  const countPromise = FileManager.countDocuments(filter);
  let docsPromise = FileManager.find(filter)
    .populate('folder.createdBy', 'name email')
    .populate('file.uploadedBy', 'name email')
    .sort(options.sortBy || 'type:asc,folder.name:asc,file.fileName:asc');
  
  if (hasLimit) {
    docsPromise = docsPromise.skip(skip).limit(limit);
  }
  
  const docsResult = await docsPromise.lean(); // Use lean() to get plain objects
  const [totalResults, results] = await Promise.all([countPromise, Promise.resolve(docsResult)]);
  const totalPages = hasLimit ? Math.ceil(totalResults / limit) : 1;
  
  const result = {
    results,
    page,
    limit,
    totalPages,
    totalResults,
  };

  // Log each result item individually
  if (result.results && result.results.length > 0) {

    result.results.forEach((item, index) => {

    });
  }

  const response = {
    folder,
    contents: result,
  };

  return response;
};

/**
 * Get root folders for a user
 * @param {ObjectId} userId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const getRootFolders = async (userId, options = {}) => {
  const filter = {
    type: 'folder',
    'folder.createdBy': userId,
    'folder.isRoot': true,
    isDeleted: false,
  };

  const result = await FileManager.paginate(filter, {
    ...options,
    populate: 'folder.createdBy',
    sortBy: options.sortBy || 'folder.name:asc',
  });

  return result;
};

/**
 * Update folder
 * @param {ObjectId} folderId
 * @param {Object} updateBody
 * @returns {Promise<FileManager>}
 */
const updateFolder = async (folderId, updateBody) => {
  const folder = await getFolderById(folderId);
  
  const { name, description, metadata } = updateBody;
  
  // Check if new name conflicts with existing folder
  if (name && name !== folder.folder.name) {
    const isNameTaken = await FileManager.isFolderNameTaken(name, folder.folder.parentFolder, folderId);
    if (isNameTaken) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Folder name already exists in this location');
    }
  }

  // Update folder
  Object.assign(folder.folder, {
    name: name || folder.folder.name,
    description: description !== undefined ? description : folder.folder.description,
    metadata: metadata || folder.folder.metadata,
  });

  await folder.save();
  return folder;
};

/**
 * Update file
 * @param {ObjectId} fileId
 * @param {Object} updateBody
 * @returns {Promise<FileManager>}
 */
const updateFile = async (fileId, updateBody) => {
  const file = await getFileById(fileId);
  
  const { fileName, fileUrl, fileKey, fileSize, mimeType, metadata } = updateBody;
  
  // Check if new name conflicts with existing file
  if (fileName && fileName !== file.file.fileName) {
    const isNameTaken = await FileManager.isFileNameTaken(fileName, file.file.parentFolder, fileId);
    if (isNameTaken) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'File name already exists in this folder');
    }
  }

  // Update file
  Object.assign(file.file, {
    fileName: fileName || file.file.fileName,
    fileUrl: fileUrl || file.file.fileUrl,
    fileKey: fileKey || file.file.fileKey,
    fileSize: fileSize !== undefined ? fileSize : file.file.fileSize,
    mimeType: mimeType || file.file.mimeType,
    metadata: metadata || file.file.metadata,
  });

  await file.save();
  return file;
};

/**
 * Delete folder and all its contents recursively
 * @param {ObjectId} folderId
 * @returns {Promise<Object>}
 */
const deleteFolder = async (folderId) => {
  const folder = await getFolderById(folderId);
  
  // Get all descendants
  const descendants = await folder.getAllDescendants();
  
  // Soft delete all descendants
  const descendantIds = descendants.map(item => item._id);
  descendantIds.push(folderId);
  
  await FileManager.updateMany(
    { _id: { $in: descendantIds } },
    { isDeleted: true }
  );

  return {
    deletedFolder: folder,
    deletedItems: descendants.length + 1,
  };
};

/**
 * Delete file
 * @param {ObjectId} fileId
 * @returns {Promise<FileManager>}
 */
const deleteFile = async (fileId) => {
  const file = await getFileById(fileId);
  const fileKey = file.file && file.file.fileKey;
  file.isDeleted = true;
  await file.save();
  if (fileKey) {
    try {
      await deleteFileFromS3(fileKey);

    } catch (err) {

    }
  }
  return file;
};

/**
 * Delete multiple items
 * @param {Array<ObjectId>} itemIds
 * @returns {Promise<Object>}
 */
const deleteMultipleItems = async (itemIds) => {
  const items = await FileManager.find({
    _id: { $in: itemIds },
    isDeleted: false,
  });

  if (items.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No items found to delete');
  }

  const foldersToDelete = [];
  const filesToDelete = [];

  // Separate folders and files
  for (const item of items) {
    if (item.type === 'folder') {
      foldersToDelete.push(item);
    } else {
      filesToDelete.push(item);
    }
  }

  // Delete folders recursively
  const deletedFolders = [];
  for (const folder of foldersToDelete) {
    const result = await deleteFolder(folder._id);
    deletedFolders.push(result);
  }

  // Delete files
  const deletedFiles = [];
  for (const file of filesToDelete) {
    const result = await deleteFile(file._id);
    deletedFiles.push(result);
  }

  return {
    deletedFolders,
    deletedFiles,
    totalDeleted: items.length,
  };
};

/**
 * Search files and folders (enhanced with recursive subfolder search)
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const searchItems = async (filter, options = {}) => {

  // Check if this is a search query or just a filter request
  if (filter.query) {
    // This is a text search - create search pattern
    const searchPattern = filter.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special characters

    const searchFilter = {
      isDeleted: false,
      $or: [
        { 'folder.name': { $regex: searchPattern, $options: 'i' } },
        { 'file.fileName': { $regex: searchPattern, $options: 'i' } },
        { 'folder.path': { $regex: searchPattern, $options: 'i' } }, // Search in folder paths
        { 'folder.description': { $regex: searchPattern, $options: 'i' } }, // Search in folder descriptions
      ],
    };

    if (filter.type) {
      searchFilter.type = filter.type;
    }

    // Handle user permissions more flexibly
    if (filter.userId) {

      searchFilter.$and = [
        {
          $or: [
            { 'folder.createdBy': filter.userId },
            { 'file.uploadedBy': filter.userId },
            { 'folder.metadata.clientId': { $exists: true } }
          ]
        }
      ];
    } else {
      delete searchFilter.$and;
    }

    // Test the search filter directly to see what it finds

    const testQuery = await FileManager.find(searchFilter).limit(3);

    if (testQuery.length > 0) {

    }

    const result = await FileManager.paginate(searchFilter, {
      ...options,
      populate: 'folder.createdBy,file.uploadedBy',
      sortBy: options.sortBy || 'type:asc,folder.name:asc,file.fileName:asc',
    });

    if (result.totalResults > 0) {

      if (result.results[0].type === 'folder') {

      }
    } else {

      const debugFolders = await FileManager.find({
        type: 'folder',
        isDeleted: false,
        'folder.name': { $regex: 'Abhishek', $options: 'i' }
      }).limit(5);

      if (debugFolders.length > 0) {

      }
      
      const allFolders = await FileManager.find({
        type: 'folder',
        isDeleted: false
      }).limit(3);

    }

    return result;
  } else {
    // This is just a filter request (no text search) - use simple filtering

    const searchFilter = {
      isDeleted: false,
    };

    if (filter.type) {
      searchFilter.type = filter.type;
    }

    if (filter.userId) {
      searchFilter.$or = [
        { 'folder.createdBy': filter.userId },
        { 'file.uploadedBy': filter.userId },
        { 'folder.metadata.clientId': { $exists: true } }
      ];
    }

    const result = await FileManager.paginate(searchFilter, {
      ...options,
      populate: 'folder.createdBy,file.uploadedBy',
      sortBy: options.sortBy || 'type:asc,folder.name:asc,file.fileName:asc',
    });

    return result;
  }
};

/**
 * Recursive search through all subfolders and files
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const searchItemsRecursive = async (filter, options = {}) => {
  try {

    // First, find all folders that match the search query
    const folderSearchFilter = {
      type: 'folder',
      isDeleted: false,
      $or: [
        { 'folder.name': { $regex: filter.query, $options: 'i' } },
        { 'folder.path': { $regex: filter.query, $options: 'i' } },
        { 'folder.description': { $regex: filter.query, $options: 'i' } }
      ]
    };

    if (filter.userId) {
      folderSearchFilter['folder.createdBy'] = filter.userId;
    }

    // Find matching folders
    const matchingFolders = await FileManager.find(folderSearchFilter)
      .populate('folder.createdBy', 'name email')
      .lean();

    // Find all files that match the search query
    const fileSearchFilter = {
      type: 'file',
      isDeleted: false,
      $or: [
        { 'file.fileName': { $regex: filter.query, $options: 'i' } },
        { 'file.metadata': { $regex: filter.query, $options: 'i' } }
      ]
    };

    if (filter.userId) {
      fileSearchFilter['file.uploadedBy'] = filter.userId;
    }

    // Find matching files
    const matchingFiles = await FileManager.find(fileSearchFilter)
      .populate('file.uploadedBy', 'name email')
      .lean();

    // Combine results
    const allResults = [...matchingFolders, ...matchingFiles];

    // Apply pagination manually since we're combining results
    const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
    const limit = hasLimit ? parseInt(options.limit, 10) : null;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = hasLimit ? (page - 1) * limit : 0;

    // Sort results
    let sortedResults = allResults.sort((a, b) => {
      if (a.type === b.type) {
        if (a.type === 'folder') {
          return a.folder.name.localeCompare(b.folder.name);
        } else {
          return a.file.fileName.localeCompare(b.file.fileName);
        }
      }
      return a.type === 'folder' ? -1 : 1; // Folders first
    });

    // Apply pagination
    const totalResults = sortedResults.length;
    const totalPages = hasLimit ? Math.ceil(totalResults / limit) : 1;
    const paginatedResults = hasLimit ? sortedResults.slice(skip, skip + limit) : sortedResults;

    // Add id field to each result since we're using lean()
    const resultsWithId = paginatedResults.map(item => ({
      ...item,
      id: item._id.toString()
    }));

    const result = {
      results: resultsWithId,
      page,
      limit,
      totalPages,
      totalResults,
    };

    return result;
  } catch (error) {

    throw error;
  }
};

/**
 * Search specifically for subfolders by name
 * @param {string} subfolderName
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const searchSubfoldersByName = async (subfolderName, options = {}) => {
  try {

    const searchFilter = {
      type: 'folder',
      isDeleted: false,
      $or: [
        { 'folder.name': { $regex: subfolderName, $options: 'i' } },
        { 'folder.path': { $regex: subfolderName, $options: 'i' } }
      ]
    };

    if (options.userId) {
      searchFilter['folder.createdBy'] = options.userId;
    }

    if (options.parentFolder) {
      searchFilter['folder.parentFolder'] = options.parentFolder;
    }

    // Use direct query for better control
    const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
    const limit = hasLimit ? parseInt(options.limit, 10) : null;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = hasLimit ? (page - 1) * limit : 0;

    const countPromise = FileManager.countDocuments(searchFilter);
    let docsPromise = FileManager.find(searchFilter)
      .populate('folder.createdBy', 'name email')
      .populate('folder.parentFolder', 'folder.name')
      .sort(options.sortBy || 'folder.name:asc');
    
    if (hasLimit) {
      docsPromise = docsPromise.skip(skip).limit(limit);
    }
    
    const docsResult = await docsPromise.lean();
    const [totalResults, results] = await Promise.all([countPromise, Promise.resolve(docsResult)]);
    const totalPages = hasLimit ? Math.ceil(totalResults / limit) : 1;

    // Add id field to each result since we're using lean()
    const resultsWithId = results.map(item => ({
      ...item,
      id: item._id.toString()
    }));

    const result = {
      results: resultsWithId,
      page,
      limit,
      totalPages,
      totalResults,
    };

    return result;
  } catch (error) {

    throw error;
  }
};

/**
 * Search specifically for client subfolders by name (optimized for client search)
 * @param {string} query
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const searchClientSubfolders = async (query, options = {}) => {
  try {

    // Create search pattern
    const searchPattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const searchFilter = {
      type: 'folder',
      isDeleted: false,
      'folder.parentFolder': { $exists: true }, // Must have a parent (not root)
      $or: [
        { 'folder.name': { $regex: searchPattern, $options: 'i' } },
        { 'folder.path': { $regex: searchPattern, $options: 'i' } }
      ]
    };

    // If we want to specifically search in Clients folder, we can add this filter
    if (options.onlyClientFolders) {
      // Find the Clients parent folder first
      const clientsParentFolder = await FileManager.findOne({
        type: 'folder',
        'folder.name': 'Clients',
        'folder.isRoot': true,
        isDeleted: false
      });
      
      if (clientsParentFolder) {
        searchFilter['folder.parentFolder'] = clientsParentFolder._id;
      }
    }

    // Use direct query for better control
    const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
    const limit = hasLimit ? parseInt(options.limit, 10) : null;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = hasLimit ? (page - 1) * limit : 0;

    const countPromise = FileManager.countDocuments(searchFilter);
    let docsPromise = FileManager.find(searchFilter)
      .populate('folder.createdBy', 'name email')
      .populate('folder.parentFolder', 'folder.name')
      .sort(options.sortBy || 'folder.name:asc');
    
    if (hasLimit) {
      docsPromise = docsPromise.skip(skip).limit(limit);
    }
    
    const docsResult = await docsPromise.lean();
    const [totalResults, results] = await Promise.all([countPromise, Promise.resolve(docsResult)]);
    const totalPages = hasLimit ? Math.ceil(totalResults / limit) : 1;

    // Transform results to a cleaner format
    const transformedResults = results.map(item => ({
      id: item._id.toString(),
      type: 'folder',
      name: item.folder.name,
      path: item.folder.path,
      description: item.folder.description,
      createdBy: item.folder.createdBy,
      parentFolder: item.folder.parentFolder,
      metadata: item.folder.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    const result = {
      results: transformedResults,
      page,
      limit,
      totalPages,
      totalResults,
    };

    return result;
  } catch (error) {

    throw error;
  }
};

/**
 * Get folder tree structure
 * @param {ObjectId} userId
 * @param {ObjectId} rootFolderId
 * @returns {Promise<Object>}
 */
const getFolderTree = async (userId, rootFolderId = null) => {
  const buildTree = async (parentId) => {
    const children = await FileManager.find({
      type: 'folder',
      'folder.parentFolder': parentId,
      'folder.createdBy': userId,
      isDeleted: false,
    }).populate('folder.createdBy', 'name email');

    const tree = [];
    for (const child of children) {
      const node = {
        id: child._id,
        name: child.folder.name,
        path: child.folder.path,
        description: child.folder.description,
        createdBy: child.folder.createdBy,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
        children: await buildTree(child._id),
      };
      tree.push(node);
    }

    return tree;
  };

  const tree = await buildTree(rootFolderId);
  return tree;
};

/**
 * Upload file to client folder
 * @param {ObjectId} clientId
 * @param {Object} fileData
 * @returns {Promise<FileManager>}
 */
const uploadFileToClientFolder = async (clientId, fileData) => {
  // First, verify the client exists
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  // Find the client's folder
  const clientFolder = await FileManager.findOne({
    type: 'folder',
    'folder.metadata.clientId': new mongoose.Types.ObjectId(clientId),
    isDeleted: false,
  });

  if (!clientFolder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client folder not found. Please ensure client folder was created properly.');
  }

  // Check if file name already exists in the client folder
  const isNameTaken = await FileManager.isFileNameTaken(fileData.fileName, clientFolder._id);
  if (isNameTaken) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File name already exists in this client folder');
  }

  // Create the file in the client folder
  const file = await FileManager.create({
    type: 'file',
    file: {
      fileName: fileData.fileName,
      fileUrl: fileData.fileUrl,
      fileKey: fileData.fileKey,
      fileSize: fileData.fileSize || 0,
      mimeType: fileData.mimeType,
      metadata: {
        ...fileData.metadata,
        clientId: clientId,
        clientName: client.name,
      },
      uploadedBy: fileData.uploadedBy,
      parentFolder: clientFolder._id,
    },
  });

  return file;
};

/**
 * Get client folder contents
 * @param {ObjectId} clientId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const getClientFolderContents = async (clientId, options = {}) => {
  // First, verify the client exists
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  // Find the client's folder
  const clientFolder = await FileManager.findOne({
    type: 'folder',
    'folder.metadata.clientId': new mongoose.Types.ObjectId(clientId),
    isDeleted: false,
  });

  if (!clientFolder) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client folder not found. Please ensure client folder was created properly.');
  }

  // Get all contents of the client folder using direct query instead of paginate
  const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
  const limit = hasLimit ? parseInt(options.limit, 10) : null;
  const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const skip = hasLimit ? (page - 1) * limit : 0;

  const filter = {
    $or: [
      { 'folder.parentFolder': clientFolder._id },
      { 'file.parentFolder': clientFolder._id }
    ],
    isDeleted: false,
  };

  const countPromise = FileManager.countDocuments(filter);
  let docsPromise = FileManager.find(filter)
    .sort(options.sortBy || 'type:asc,folder.name:asc,file.fileName:asc');
  
  if (hasLimit) {
    docsPromise = docsPromise.skip(skip).limit(limit);
  }
  
  const docsResult = await docsPromise.lean(); // Use lean() to get plain objects
  const [totalResults, results] = await Promise.all([countPromise, Promise.resolve(docsResult)]);
  const totalPages = hasLimit ? Math.ceil(totalResults / limit) : 1;

  // Add id field to each result since we're using lean()
  const resultsWithId = results.map(item => ({
    ...item,
    id: item._id.toString()
  }));

  const result = {
    results: resultsWithId,
    page,
    limit,
    totalPages,
    totalResults,
  };

  return {
    ...result,
    clientFolder: {
      id: clientFolder._id,
      name: clientFolder.folder.name,
      path: clientFolder.folder.path,
      description: clientFolder.folder.description,
      createdAt: clientFolder.createdAt,
      updatedAt: clientFolder.updatedAt,
    },
    client: {
      id: client._id,
      name: client.name,
      email: client.email,
    },
  };
};

export {
  createFolder,
  createFile,
  getFolderById,
  getFileById,
  getFolderContents,
  getRootFolders,
  updateFolder,
  updateFile,
  deleteFolder,
  deleteFile,
  deleteMultipleItems,
  searchItems,
  searchItemsRecursive,
  searchSubfoldersByName,
  searchClientSubfolders,
  getFolderTree,
  uploadFileToClientFolder,
  getClientFolderContents,
}; 