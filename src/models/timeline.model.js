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
    frequency: {
      type: String,
      enum: ['daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    frequencyCount: {
      type: String,
      enum: ['once', 'twice'],
      required: true,
    },
    udin: {
      type: String,
      required: false,
      trim: true,
    },
    turnover: {
      type: Number,
      required: false,
    },
    assignedMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      required: true,
    },
    dueDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
timelineSchema.plugin(toJSON);
timelineSchema.plugin(paginate);

/**
 * @typedef Timeline
 */
const Timeline = mongoose.model('Timeline', timelineSchema);

export default Timeline;
