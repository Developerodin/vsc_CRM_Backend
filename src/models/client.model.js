import mongoose from 'mongoose';
import validator from 'validator';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const clientSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      validate(value) {
        if (!validator.isMobilePhone(value, 'any')) {
          throw new Error('Invalid phone number');
        }
      },
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
    groups: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    }],
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
clientSchema.plugin(toJSON);
clientSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The client's email
 * @param {ObjectId} [excludeClientId] - The id of the client to be excluded
 * @returns {Promise<boolean>}
 */
clientSchema.statics.isEmailTaken = async function (email, excludeClientId) {
  const client = await this.findOne({ email, _id: { $ne: excludeClientId } });
  return !!client;
};

/**
 * Check if phone is taken
 * @param {string} phone - The client's phone
 * @param {ObjectId} [excludeClientId] - The id of the client to be excluded
 * @returns {Promise<boolean>}
 */
clientSchema.statics.isPhoneTaken = async function (phone, excludeClientId) {
  const client = await this.findOne({ phone, _id: { $ne: excludeClientId } });
  return !!client;
};

/**
 * @typedef Client
 */
const Client = mongoose.model('Client', clientSchema);

export default Client; 