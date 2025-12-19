import express from 'express';
import clientAuth from '../../middlewares/clientAuth.js';
import * as fileManagerService from '../../services/fileManager.service.js';
import catchAsync from '../../utils/catchAsync.js';
import validate from '../../middlewares/validate.js';
import { getFolderContents } from '../../validations/fileManager.validation.js';

const router = express.Router();

// Apply client authentication to all routes
router.use(clientAuth());

// Get client's own file contents
router.get('/clients/:clientId/contents', catchAsync(async (req, res) => {
  // Verify that the authenticated client is accessing their own data
  const authenticatedId = req.user.id || req.user._id?.toString();
  const requestedId = req.params.clientId;
  
  if (authenticatedId !== requestedId) {
    return res.status(403).json({
      code: 403,
      message: 'Access denied. You can only access your own files.'
    });
  }

  // Use the existing file manager service to get actual client files
  const options = {
    sortBy: req.query.sortBy || 'type:asc,folder.name:asc,file.fileName:asc',
    limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    page: parseInt(req.query.page) || 1
  };

  const result = await fileManagerService.getClientFolderContents(requestedId, options);
  
  res.json(result);
}));

// Get folder contents (supports subfolders)
router.get('/folders/:folderId/contents', validate(getFolderContents), catchAsync(async (req, res) => {
  const authenticatedId = req.user.id || req.user._id?.toString();
  const folderId = req.params.folderId;

  // Get folder contents
  const options = {
    sortBy: req.query.sortBy || 'type:asc,folder.name:asc,file.fileName:asc',
    limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    page: parseInt(req.query.page) || 1
  };

  const result = await fileManagerService.getClientFolderContentsByFolderId(folderId, options);

  // Verify that the authenticated client can access this folder
  // If the folder is associated with a client, check if it's the authenticated client
  if (result.client && result.client.id !== authenticatedId) {
    return res.status(403).json({
      code: 403,
      message: 'Access denied. You can only access your own files.'
    });
  }

  res.json(result);
}));

// Upload file for client
router.post('/clients/:clientId/upload', catchAsync(async (req, res) => {
  // Verify that the authenticated client is uploading to their own account
  const authenticatedId = req.user.id || req.user._id?.toString();
  const requestedId = req.params.clientId;
  
  if (authenticatedId !== requestedId) {
    return res.status(403).json({
      code: 403,
      message: 'Access denied. You can only upload to your own account.'
    });
  }

  // Use the existing file manager service to upload file
  const fileData = {
    ...req.body,
    uploadedBy: req.user.id,
  };
  
  const file = await fileManagerService.uploadFileToClientFolder(requestedId, fileData);
  
  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: file
  });
}));

// Download file for client
router.get('/clients/:clientId/files/:fileId', catchAsync(async (req, res) => {
  // Verify that the authenticated client is downloading their own file
  const authenticatedId = req.user.id || req.user._id?.toString();
  const requestedId = req.params.clientId;
  
  if (authenticatedId !== requestedId) {
    return res.status(403).json({
      code: 403,
      message: 'Access denied. You can only download your own files.'
    });
  }

  // Get file details using existing service
  const file = await fileManagerService.getFileById(req.params.fileId);
  
  // Verify the file belongs to this client
  if (file.file.metadata?.clientId !== requestedId) {
    return res.status(403).json({
      code: 403,
      message: 'Access denied. You can only download your own files.'
    });
  }

  res.json({
    success: true,
    data: file
  });
}));

// Delete file for client
router.delete('/clients/:clientId/files/:fileId', catchAsync(async (req, res) => {
  // Verify that the authenticated client is deleting their own file
  const authenticatedId = req.user.id || req.user._id?.toString();
  const requestedId = req.params.clientId;
  
  if (authenticatedId !== requestedId) {
    return res.status(403).json({
      code: 403,
      message: 'Access denied. You can only delete your own files.'
    });
  }

  // Get file details first to verify ownership
  const file = await fileManagerService.getFileById(req.params.fileId);
  
  // Verify the file belongs to this client
  if (file.file.metadata?.clientId !== requestedId) {
    return res.status(403).json({
      code: 403,
      message: 'Access denied. You can only delete your own files.'
    });
  }

  // Delete the file using existing service
  await fileManagerService.deleteFile(req.params.fileId);
  
  res.json({
    success: true,
    message: 'File deleted successfully'
  });
}));

export default router;
