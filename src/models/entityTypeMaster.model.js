import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const entityTypeMasterSchema = mongoose.Schema(
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
entityTypeMasterSchema.plugin(toJSON);
entityTypeMasterSchema.plugin(paginate);

/**
 * @typedef EntityTypeMaster
 */
const EntityTypeMaster = mongoose.model('EntityTypeMaster', entityTypeMasterSchema);

export default EntityTypeMaster;
