import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const groupSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    numberOfClients: {
      type: Number,
      required: true,
      default: 0,
    },
    clients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client'
    }],
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
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

// Indexes for better query performance
groupSchema.index({ branch: 1, name: 1 }); // For branch filtering and name searches
groupSchema.index({ clients: 1 }); // For client-based queries
groupSchema.index({ name: 1 }); // For name searches
groupSchema.index({ branch: 1 }); // For branch filtering

// add plugin that converts mongoose to json
groupSchema.plugin(toJSON);
groupSchema.plugin(paginate);

/**
 * @typedef Group
 */
const Group = mongoose.model('Group', groupSchema);

export default Group; 