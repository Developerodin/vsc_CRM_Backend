import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const taskSchema = mongoose.Schema(
  {
    // Required fields
    teamMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent', 'critical'],
      required: true,
      default: 'medium',
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    
    // Optional fields (default: null so they always appear in GET response)
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedByTeamMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      default: null,
    },
    timeline: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timeline',
    }],
    remarks: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed'],
      default: 'pending',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    attachments: [{
      fileName: {
        type: String,
        required: true,
      },
      fileUrl: {
        type: String,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
taskSchema.index({ teamMember: 1, status: 1 });
taskSchema.index({ branch: 1, status: 1 });
taskSchema.index({ startDate: 1, endDate: 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ assignedByTeamMember: 1 });
taskSchema.index({ assignedByTeamMember: 1, teamMember: 1 }); // Compound index for team member assignment queries
taskSchema.index({ status: 1, createdAt: -1 }); // For status-based queries with recent first
taskSchema.index({ createdAt: -1 }); // For general sorting by creation date
taskSchema.index({ teamMember: 1, createdAt: -1 }); // For team member task history
// Index for timeline array field - critical for group statistics queries
taskSchema.index({ timeline: 1 });
taskSchema.index({ status: 1, timeline: 1 }); // Compound index for status + timeline queries

// Instance method to add attachment
taskSchema.methods.addAttachment = function(fileName, fileUrl) {
  this.attachments.push({
    fileName,
    fileUrl,
    uploadedAt: new Date(),
  });
  return this.save();
};

// Instance method to remove attachment
taskSchema.methods.removeAttachment = function(fileName) {
  this.attachments = this.attachments.filter(att => att.fileName !== fileName);
  return this.save();
};

// Static method to get tasks by team member
taskSchema.statics.getTasksByTeamMember = function(teamMemberId, status = null) {
  const query = { teamMember: teamMemberId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('assignedBy', 'name email')
    .populate('assignedByTeamMember', 'name email')
    .populate('timeline', 'activity client');
};

// Static method to get tasks by branch
taskSchema.statics.getTasksByBranch = function(branchId, status = null) {
  const query = { branch: branchId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('teamMember', 'name email')
    .populate('assignedBy', 'name email')
    .populate('assignedByTeamMember', 'name email');
};

// Static method to get overdue tasks
taskSchema.statics.getOverdueTasks = function() {
  const now = new Date();
  return this.find({
    endDate: { $lt: now },
    status: { $nin: ['completed', 'cancelled'] }
  })
    .populate('teamMember', 'name email')
    .populate('assignedBy', 'name email')
    .populate('assignedByTeamMember', 'name email');
};

// Static method to get high priority tasks
taskSchema.statics.getHighPriorityTasks = function() {
  return this.find({
    priority: { $in: ['high', 'urgent', 'critical'] },
    status: { $nin: ['completed', 'cancelled'] }
  })
    .populate('teamMember', 'name email')
    .populate('assignedBy', 'name email')
    .populate('assignedByTeamMember', 'name email');
};

// Static method to get delayed tasks
taskSchema.statics.getDelayedTasks = function() {
  return this.find({
    status: 'delayed'
  })
    .populate('teamMember', 'name email')
    .populate('assignedBy', 'name email')
    .populate('assignedByTeamMember', 'name email');
};

/**
 * Start of today in UTC (midnight). Used so "end date = today" is not marked delayed
 * until the next calendar day (end date stored as midnight UTC).
 */
function getStartOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Static method to automatically update delayed status for all tasks
taskSchema.statics.updateDelayedStatus = function() {
  const startOfTodayUTC = getStartOfTodayUTC();

  // Delayed only when end date's calendar day is before today (end date stored as midnight UTC)
  const updateToDelayed = this.updateMany(
    {
      endDate: { $lt: startOfTodayUTC },
      status: { $nin: ['completed', 'cancelled', 'delayed'] }
    },
    { status: 'delayed' }
  );

  // Revert to pending when end date is today or in the future
  const updateToPending = this.updateMany(
    {
      endDate: { $gte: startOfTodayUTC },
      status: 'delayed'
    },
    { status: 'pending' }
  );

  return Promise.all([updateToDelayed, updateToPending]);
};

// Static method to check and update task statuses based on current time
taskSchema.statics.checkAndUpdateAllTaskStatuses = async function() {
  const startOfTodayUTC = getStartOfTodayUTC();
  console.log(`[${new Date().toISOString()}] Checking and updating task statuses...`);
  
  try {
    // Find all active tasks (not completed/cancelled)
    const activeTasks = await this.find({
      status: { $nin: ['completed', 'cancelled'] }
    });
    
    let delayedCount = 0;
    let pendingCount = 0;
    
    for (const task of activeTasks) {
      let statusChanged = false;
      
      // Delayed only when end date's calendar day is before today
      if (task.endDate < startOfTodayUTC && task.status !== 'delayed') {
        task.status = 'delayed';
        statusChanged = true;
        delayedCount++;
        console.log(`Task ${task._id} marked as delayed (end date: ${task.endDate})`);
      }
      
      // Revert to pending when end date is today or in the future
      if (task.endDate >= startOfTodayUTC && task.status === 'delayed') {
        task.status = 'pending';
        statusChanged = true;
        pendingCount++;
        console.log(`Task ${task._id} reverted to pending (end date extended to: ${task.endDate})`);
      }
      
      // Save if status changed
      if (statusChanged) {
        await task.save();
      }
    }
    
    console.log(`[${new Date().toISOString()}] Status update complete: ${delayedCount} tasks delayed, ${pendingCount} tasks reverted to pending`);
    return { delayedCount, pendingCount };
    
  } catch (error) {
    console.error('Error updating task statuses:', error);
    throw error;
  }
};

// Ensure assignedBy/assignedByTeamMember always appear in JSON (null if unset)
taskSchema.options.toJSON = taskSchema.options.toJSON || {};
taskSchema.options.toJSON.transform = function ensureAssignerKeys(doc, ret, options) {
  ret.assignedBy = ret.assignedBy ?? null;
  ret.assignedByTeamMember = ret.assignedByTeamMember ?? null;
};

// add plugin that converts mongoose to json
taskSchema.plugin(toJSON);
taskSchema.plugin(paginate);

/**
 * @typedef Task
 */
const Task = mongoose.model('Task', taskSchema);

export default Task;
