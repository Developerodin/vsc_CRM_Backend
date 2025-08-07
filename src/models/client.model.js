import mongoose from 'mongoose';
import validator from 'validator';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';
import FileManager from './fileManager.model.js';

const clientSchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      validate(value) {
        if (value && !validator.isMobilePhone(value, 'any')) {
          throw new Error('Invalid phone number');
        }
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate(value) {
        if (value && !validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    email2: {
      type: String,
      trim: true,
      lowercase: true,
      validate(value) {
        if (value && !validator.isEmail(value)) {
          throw new Error('Invalid email2');
        }
      },
    },
    address: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    fNo: {
      type: String,
      trim: true,
    },
    pan: {
      type: String,
      trim: true,
      validate(value) {
        if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          throw new Error('Invalid PAN format');
        }
      },
    },
    dob: {
      type: Date,
      validate(value) {
        if (value && value > new Date()) {
          throw new Error('Date of birth cannot be in the future');
        }
      },
    },
    // New business-related fields
    businessType: {
      type: String,
      trim: true,
      description: 'Type of business or trade'
    },
    gstNumber: {
      type: String,
      trim: true,
      validate(value) {
        if (value && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
          throw new Error('Invalid GST number format');
        }
      },
      description: 'GST Registration Number'
    },
    tanNumber: {
      type: String,
      trim: true,
      validate(value) {
        if (value && !/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(value)) {
          throw new Error('Invalid TAN number format');
        }
      },
      description: 'Tax Deduction and Collection Account Number'
    },
    cinNumber: {
      type: String,
      trim: true,
      validate(value) {
        if (value && !/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(value)) {
          throw new Error('Invalid CIN number format');
        }
      },
      description: 'Corporate Identity Number'
    },
    udyamNumber: {
      type: String,
      trim: true,
      validate(value) {
        if (value && !/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/.test(value)) {
          throw new Error('Invalid Udyam Registration Number format');
        }
      },
      description: 'Udyam Registration Number (MSME)'
    },
    iecCode: {
      type: String,
      trim: true,
      validate(value) {
        if (value && !/^[0-9]{10}$/.test(value)) {
          throw new Error('Invalid IEC Code format (should be 10 digits)');
        }
      },
      description: 'Import Export Code'
    },
    entityType: {
      type: String,
      trim: true,
      enum: [
        'Proprietorship',
        'Partnership',
        'Private Limited',
        'Public Limited',
        'LLP',
        'Sole Proprietorship',
        'HUF',
        'Trust',
        'Society',
        'Other'
      ],
      description: 'Type of business entity'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: 'Additional flexible data storage for client information'
    },
    activities: [{
      activity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
        required: true,
        description: 'Reference to the activity'
      },
      assignedTeamMember: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember',
        required: true,
        description: 'Reference to the team member assigned to this activity'
      },
      assignedDate: {
        type: Date,
        default: Date.now,
        description: 'Date when the activity was assigned to the team member'
      },
      notes: {
        type: String,
        trim: true,
        description: 'Additional notes for this activity assignment'
      }
    }],
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    sortOrder: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
clientSchema.plugin(toJSON);
clientSchema.plugin(paginate);

// Post-save middleware to create client subfolder
clientSchema.post('save', async function(doc) {
  try {
    // Ensure Clients parent folder exists
    let clientsParentFolder = await FileManager.findOne({
      type: 'folder',
      'folder.name': 'Clients',
      'folder.isRoot': true,
      isDeleted: false
    });

    if (!clientsParentFolder) {
      clientsParentFolder = await FileManager.create({
        type: 'folder',
        folder: {
          name: 'Clients',
          description: 'Parent folder for all client subfolders',
          parentFolder: null,
          createdBy: doc.branch, // Using branch as createdBy for now
          isRoot: true,
          path: '/Clients'
        }
      });
    }

    // Create client subfolder if it doesn't exist
    const existingClientFolder = await FileManager.findOne({
      type: 'folder',
      'folder.name': doc.name,
      'folder.parentFolder': clientsParentFolder._id,
      isDeleted: false
    });

    if (!existingClientFolder) {
      await FileManager.create({
        type: 'folder',
        folder: {
          name: doc.name,
          description: `Folder for client: ${doc.name}`,
          parentFolder: clientsParentFolder._id,
          createdBy: doc.branch, // Using branch as createdBy for now
          isRoot: false,
          path: `/Clients/${doc.name}`,
          metadata: {
            clientId: doc._id,
            clientName: doc.name
          }
        }
      });
    }
  } catch (error) {
    console.error('Error creating client subfolder:', error);
  }
});

/**
 * @typedef Client
 */
const Client = mongoose.model('Client', clientSchema);

export default Client; 