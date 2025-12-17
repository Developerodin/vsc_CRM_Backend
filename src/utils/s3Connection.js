import AWS from 'aws-sdk';
import config from '../config/config.js';

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

/**
 * Test S3 connection by attempting to list buckets
 * @returns {Promise<boolean>} - Returns true if connection is successful
 */
const testS3Connection = async () => {
    try {
        // Test connection by listing buckets
        await s3Config.listBuckets().promise();
        console.log('✅ AWS S3 connection successful');
        return true;
    } catch (error) {
        console.error('❌ AWS S3 connection failed:', error.message);
        return false;
    }
};

export {
    s3Config as s3,
    testS3Connection
}; 