import mongoose from 'mongoose';
import validator from 'validator';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const branchSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    branchHead: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate(value) {
        if (!validator.isMobilePhone(value, 'any')) {
          throw new Error('Invalid phone number');
        }
      },
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    pinCode: {
      type: String,
      required: true,
      trim: true,
      validate(value) {
        if (!validator.isPostalCode(value, 'any')) {
          throw new Error('Invalid pin code');
        }
      },
    },
    sortOrder: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
branchSchema.plugin(toJSON);
branchSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The branch's email
 * @param {ObjectId} [excludeBranchId] - The id of the branch to be excluded
 * @returns {Promise<boolean>}
 */
branchSchema.statics.isEmailTaken = async function (email, excludeBranchId) {
  const branch = await this.findOne({ email, _id: { $ne: excludeBranchId } });
  return !!branch;
};

/**
 * Check if phone is taken
 * @param {string} phone - The branch's phone
 * @param {ObjectId} [excludeBranchId] - The id of the branch to be excluded
 * @returns {Promise<boolean>}
 */
branchSchema.statics.isPhoneTaken = async function (phone, excludeBranchId) {
  const branch = await this.findOne({ phone, _id: { $ne: excludeBranchId } });
  return !!branch;
};

/**
 * @typedef Branch
 */
const Branch = mongoose.model('Branch', branchSchema);

export default Branch; 