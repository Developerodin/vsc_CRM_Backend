import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const timelineSchema = mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'delayed', 'ongoing'],
      required: true,
      default: 'pending',
    },
    subactivity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity.subactivities',
      required: false,
    },
    period: {
      type: String,
      required: false,
      trim: true,
      // Examples: "April-2024", "May-2024", "Q1-2024", "Q2-2024", "2024-2025"
    },
    dueDate: {
      type: Date,
      required: false,
    },
    fields: [{
      fileName: {
        type: String,
        required: false,
        trim: true,
      },
      fieldType: {
        type: String,
        enum: ['text', 'number', 'date', 'email', 'phone', 'url', 'select', 'textarea', 'checkbox', 'radio'],
        required: false,
        default: 'text',
      },
      fieldValue: {
        type: mongoose.Schema.Types.Mixed,
        required: false,
      },
    }],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: {},
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// Simple pre-save middleware to ensure status is set
timelineSchema.pre('save', function(next) {
  // Ensure status is always set
  if (!this.status) {
    this.status = 'pending';
  }
  next();
});

// add plugin that converts mongoose to json
timelineSchema.plugin(toJSON);
timelineSchema.plugin(paginate);

/**
 * @typedef Timeline
 */
const Timeline = mongoose.model('Timeline', timelineSchema);

export default Timeline;
