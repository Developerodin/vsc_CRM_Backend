import mongoose from 'mongoose';
import validator from 'validator';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';


const teamMemberSchema = mongoose.Schema(
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
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    sortOrder: {
      type: Number,
      required: true,
    },
    skills: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true
    }]
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
teamMemberSchema.index({ name: 1 });
teamMemberSchema.index({ email: 1 });
teamMemberSchema.index({ phone: 1 });
teamMemberSchema.index({ branch: 1 });
teamMemberSchema.index({ city: 1 });
teamMemberSchema.index({ state: 1 });
teamMemberSchema.index({ country: 1 });
teamMemberSchema.index({ sortOrder: 1 });
teamMemberSchema.index({ branch: 1, sortOrder: 1 }); // Compound index for branch + sorting
teamMemberSchema.index({ name: 1, branch: 1 }); // For name searches within branch

// add plugin that converts mongoose to json
teamMemberSchema.plugin(toJSON);
teamMemberSchema.plugin(paginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
teamMemberSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const teamMember = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!teamMember;
};

/**
 * Check if phone is taken
 * @param {string} phone - The user's phone
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
teamMemberSchema.statics.isPhoneTaken = async function (phone, excludeUserId) {
  const teamMember = await this.findOne({ phone, _id: { $ne: excludeUserId } });
  return !!teamMember;
};

/**
 * @typedef TeamMember
 */
const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

export default TeamMember;