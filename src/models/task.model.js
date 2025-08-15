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
    
    // Optional fields
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
  return this.find(query).populate('assignedBy', 'name email').populate('timeline', 'activity client');
};

// Static method to get tasks by branch
taskSchema.statics.getTasksByBranch = function(branchId, status = null) {
  const query = { branch: branchId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('teamMember', 'name email').populate('assignedBy', 'name email');
};

// Static method to get overdue tasks
taskSchema.statics.getOverdueTasks = function() {
  const now = new Date();
  return this.find({
    endDate: { $lt: now },
    status: { $nin: ['completed', 'cancelled'] }
  }).populate('teamMember', 'name email').populate('assignedBy', 'name email');
};

// Static method to get high priority tasks
taskSchema.statics.getHighPriorityTasks = function() {
  return this.find({
    priority: { $in: ['high', 'urgent', 'critical'] },
    status: { $nin: ['completed', 'cancelled'] }
  }).populate('teamMember', 'name email').populate('assignedBy', 'name email');
};

// add plugin that converts mongoose to json
taskSchema.plugin(toJSON);
taskSchema.plugin(paginate);

/**
 * @typedef Task
 */
const Task = mongoose.model('Task', taskSchema);

export default Task;
