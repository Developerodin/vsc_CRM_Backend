import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const businessMasterSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
businessMasterSchema.plugin(toJSON);
businessMasterSchema.plugin(paginate);

/**
 * @typedef BusinessMaster
 */
const BusinessMaster = mongoose.model('BusinessMaster', businessMasterSchema);

export default BusinessMaster;
