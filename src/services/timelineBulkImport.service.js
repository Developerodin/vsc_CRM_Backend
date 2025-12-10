import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { Timeline } from '../models/index.js';

/**
 * Bulk import timeline field updates
 * @param {Array} timelineUpdates - Array of timeline updates
 * @param {Object} user - User object for branch access validation
 * @returns {Promise<Object>} - Result of bulk import
 */
const bulkImportTimelineFields = async (timelineUpdates, user = null) => {
  try {

    const results = {
      total: timelineUpdates.length,
      successful: 0,
      failed: 0,
      errors: [],
      updatedTimelines: []
    };

    // Process each timeline update
    for (let i = 0; i < timelineUpdates.length; i++) {
      const update = timelineUpdates[i];
      
      try {

        // Validate required fields
        if (!update.timelineId) {
          throw new Error('Timeline ID is required');
        }
        
        if (!update.fields || !Array.isArray(update.fields) || update.fields.length === 0) {
          throw new Error('Fields array is required and must not be empty');
        }

        // Find the timeline
        const timeline = await Timeline.findById(update.timelineId);
        if (!timeline) {
          throw new Error(`Timeline with ID ${update.timelineId} not found`);
        }

        // Validate branch access if user is provided
        if (user && user.role) {
          // You can add branch access validation here if needed
          // For now, we'll allow the update
        }

        // Update timeline fields
        const updatedFields = await updateTimelineFields(timeline, update.fields);
        
        // Check if all fields are completed and update status if needed
        const allFieldsCompleted = updatedFields.every(field => 
          field.fieldValue !== null && 
          field.fieldValue !== undefined && 
          field.fieldValue !== ''
        );

        // Update timeline
        const updateData = {
          fields: updatedFields
        };

        // Auto-update status to completed if all fields are filled
        if (allFieldsCompleted && timeline.status !== 'completed') {
          updateData.status = 'completed';

        }

        // Update the timeline
        const updatedTimeline = await Timeline.findByIdAndUpdate(
          update.timelineId,
          updateData,
          { new: true, runValidators: true }
        );

        results.successful++;
        results.updatedTimelines.push({
          timelineId: update.timelineId,
          status: updatedTimeline.status,
          fieldsUpdated: updatedFields.length,
          allFieldsCompleted,
          updatedAt: updatedTimeline.updatedAt
        });

      } catch (error) {

        results.failed++;
        results.errors.push({
          timelineId: update.timelineId,
          error: error.message,
          index: i
        });
      }
    }

    if (results.errors.length > 0) {

      results.errors.forEach(error => {

      });
    }

    return results;

  } catch (error) {

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Bulk import failed', error.message);
  }
};

/**
 * Update timeline fields with new values
 * @param {Object} timeline - Timeline document
 * @param {Array} fieldUpdates - Array of field updates
 * @returns {Promise<Array>} - Updated fields array
 */
const updateTimelineFields = async (timeline, fieldUpdates) => {
  const updatedFields = [...timeline.fields];

  // Process each field update
  for (const fieldUpdate of fieldUpdates) {
    if (!fieldUpdate.fileName) {
      throw new Error('Field name (fileName) is required for each field update');
    }

    // Find the field in the timeline
    const fieldIndex = updatedFields.findIndex(field => 
      field.fileName === fieldUpdate.fileName
    );

    if (fieldIndex === -1) {
      throw new Error(`Field '${fieldUpdate.fileName}' not found in timeline`);
    }

    // Update the field value
    updatedFields[fieldIndex] = {
      ...updatedFields[fieldIndex],
      fieldValue: fieldUpdate.fieldValue
    };

  }

  return updatedFields;
};

/**
 * Validate timeline update data
 * @param {Object} updateData - Timeline update data
 * @returns {boolean} - Validation result
 */
const validateTimelineUpdate = (updateData) => {
  if (!updateData.timelineId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Timeline ID is required');
  }

  if (!updateData.fields || !Array.isArray(updateData.fields)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Fields must be an array');
  }

  if (updateData.fields.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Fields array cannot be empty');
  }

  // Validate each field
  for (const field of updateData.fields) {
    if (!field.fileName) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Field name (fileName) is required for each field');
    }
  }

  return true;
};

export {
  bulkImportTimelineFields,
  updateTimelineFields,
  validateTimelineUpdate
};
