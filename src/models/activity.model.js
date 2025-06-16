import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const activitySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sortOrder: {
      type: Number,
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
activitySchema.plugin(toJSON);
activitySchema.plugin(paginate);

/**
 * @typedef Activity
 */
const Activity = mongoose.model('Activity', activitySchema);

export default Activity; 