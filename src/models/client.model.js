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