import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import config from '../config/config.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';
import logger from '../config/logger.js';

// Configure AWS S3 with proper timeouts and retries for large files
const s3Config = new AWS.S3({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region,
    signatureVersion: 'v4',
    httpOptions: {
        timeout: 300000, // 5 minutes timeout for large files
        connectTimeout: 60000 // 1 minute connection timeout
    },
    maxRetries: 3,
    retryDelayOptions: {
        customBackoff: function(retryCount) {
            return Math.pow(2, retryCount) * 100; // Exponential backoff
        }
    }
});

// Get file size limit from config or default to 100MB
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600', 10); // 100MB default

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        // Add file type validation if needed
        cb(null, true);
    }
});

/**
 * Utility function to upload a file to S3
 * @param {Object} file - The file object from multer
 * @returns {Promise<{url: string, key: string}>} - Returns the file URL and key
 */
const uploadFileToS3 = async (file) => {
    const startTime = Date.now();
    let fileKey = null;
    
    try {
        if (!file) {
            logger.error('❌ S3 Upload Error: No file provided');
            throw new Error('No file provided');
        }

        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileKey = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        
        logger.info(`📤 Starting S3 upload: ${file.originalname} (${fileSizeMB}MB) -> ${fileKey}`);
        logger.info(`📦 S3 Config - Bucket: ${config.aws.s3.bucket}, Region: ${config.aws.region}`);
        
        const params = {
            Bucket: config.aws.s3.bucket,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype || 'application/octet-stream'
        };

        // Track upload progress for large files
        const uploadProgress = s3Config.upload(params);
        
        uploadProgress.on('httpUploadProgress', (progress) => {
            const percent = ((progress.loaded / progress.total) * 100).toFixed(2);
            const loadedMB = (progress.loaded / (1024 * 1024)).toFixed(2);
            const totalMB = (progress.total / (1024 * 1024)).toFixed(2);
            logger.info(`📊 Upload Progress: ${percent}% (${loadedMB}MB / ${totalMB}MB)`);
        });

        const uploadResult = await uploadProgress.promise();
        const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        logger.info(`✅ S3 Upload Success: ${fileKey} completed in ${uploadTime}s`);
        logger.info(`🔗 S3 URL: ${uploadResult.Location}`);
        
        return {
            url: uploadResult.Location,
            key: uploadResult.Key
        };
    } catch (error) {
        const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        logger.error(`❌ S3 Upload Failed after ${uploadTime}s`);
        logger.error(`📁 File: ${file?.originalname || 'unknown'}, Size: ${file ? (file.size / (1024 * 1024)).toFixed(2) + 'MB' : 'unknown'}`);
        logger.error(`🔑 Key: ${fileKey || 'not generated'}`);
        logger.error(`🪣 Bucket: ${config.aws.s3.bucket}, Region: ${config.aws.region}`);
        
        // Log detailed error information
        if (error.code) {
            logger.error(`🔴 Error Code: ${error.code}`);
        }
        if (error.message) {
            logger.error(`💬 Error Message: ${error.message}`);
        }
        if (error.statusCode) {
            logger.error(`📊 HTTP Status: ${error.statusCode}`);
        }
        if (error.region) {
            logger.error(`🌍 Error Region: ${error.region}`);
        }
        if (error.requestId) {
            logger.error(`🆔 Request ID: ${error.requestId}`);
        }
        if (error.stack) {
            logger.error(`📚 Stack Trace: ${error.stack}`);
        }
        
        // Provide more specific error messages
        if (error.code === 'CredentialsError' || error.code === 'InvalidAccessKeyId') {
            logger.error('🔐 AWS Credentials Error: Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
            throw new Error('AWS credentials are invalid or missing');
        }
        if (error.code === 'NoSuchBucket') {
            logger.error(`🪣 Bucket Error: Bucket "${config.aws.s3.bucket}" does not exist`);
            throw new Error(`S3 bucket "${config.aws.s3.bucket}" does not exist`);
        }
        if (error.code === 'AccessDenied') {
            logger.error('🚫 Access Denied: Check IAM permissions for S3 bucket');
            throw new Error('Access denied to S3 bucket. Check IAM permissions');
        }
        if (error.code === 'NetworkingError' || error.code === 'TimeoutError') {
            logger.error('🌐 Network/Timeout Error: Check network connection or increase timeout');
            throw new Error('Network error or timeout while uploading to S3');
        }
        
        throw error;
    }
};

/**
 * Utility function to delete a file from S3
 * @param {string} key - The file key in S3
 * @returns {Promise<void>}
 */
const deleteFileFromS3 = async (key) => {
    try {
        if (!key) {
            throw new Error('File key is required');
        }

        await s3Config.deleteObject({
            Bucket: config.aws.s3.bucket,
            Key: key
        }).promise();
    } catch (error) {
        throw error;
    }
};

/**
 * Middleware to handle multer errors
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        logger.error(`❌ Multer Error: ${err.code} - ${err.message}`);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
            const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(2);
            logger.error(`📏 File size limit exceeded. Max size: ${maxSizeMB}MB`);
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: `File size exceeds maximum limit of ${maxSizeMB}MB`,
                code: 'FILE_TOO_LARGE',
                maxSize: MAX_FILE_SIZE
            });
        }
        
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: `Upload error: ${err.message}`,
            code: err.code
        });
    }
    
    if (err) {
        logger.error(`❌ Upload Error: ${err.message}`);
        logger.error(`📚 Stack: ${err.stack}`);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: err.message || 'File upload failed',
            code: 'UPLOAD_ERROR'
        });
    }
    
    next();
};

/**
 * Upload file to S3
 */
const uploadFile = catchAsync(async (req, res) => {
    logger.info(`📥 Upload request received`);
    logger.info(`📋 Headers: ${JSON.stringify({
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
    })}`);
    
    if (!req.file) {
        logger.error('❌ No file in request');
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'No file uploaded. Make sure to use multipart/form-data with field name "file"'
        });
    }

    logger.info(`📄 File received: ${req.file.originalname}, Size: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB, Type: ${req.file.mimetype}`);

    try {
        const { url, key } = await uploadFileToS3(req.file);

        logger.info(`✅ Upload completed successfully: ${key}`);

        res.status(httpStatus.OK).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                url,
                key,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        logger.error(`❌ Upload handler error: ${error.message}`);
        throw error; // Let catchAsync handle it
    }
});

/**
 * Delete file from S3
 */
const deleteFile = catchAsync(async (req, res) => {
    const { key } = req.params;

    if (!key) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: 'File key is required'
        });
    }

    await deleteFileFromS3(key);

    res.status(httpStatus.OK).json({
        success: true,
        message: 'File deleted successfully'
    });
});

export {
    upload,
    uploadFile,
    deleteFile,
    uploadFileToS3,
    deleteFileFromS3,
    handleMulterError
}; 