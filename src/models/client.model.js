import mongoose from 'mongoose';
import validator from 'validator';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';
import FileManager from './fileManager.model.js';
import Timeline from './timeline.model.js';

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
      assignedDate: {
        type: Date,
        default: Date.now,
        description: 'Date when the activity was assigned'
      },
      notes: {
        type: String,
        trim: true,
        description: 'Additional notes for this activity'
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

// Post-save middleware to create client subfolder and timelines
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

    // Create timelines for activities with frequency configured
    if (doc.activities && doc.activities.length > 0) {
      const timelinePromises = [];
      
      for (const activityItem of doc.activities) {
        try {
          // Get the full activity document to check frequency
          const Activity = mongoose.model('Activity');
          const activity = await Activity.findById(activityItem.activity);
          
          // Only create timeline if activity has frequency and frequencyConfig
          if (activity && activity.frequency && activity.frequencyConfig) {
            // Calculate start and end dates (1 year from today)
            const startDate = new Date();
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);
            
            // Create timeline
            const timeline = new Timeline({
              activity: activity._id,
              client: doc._id,
              status: 'pending',
              startDate: startDate,
              endDate: endDate,
              frequency: activity.frequency,
              frequencyConfig: activity.frequencyConfig,
              branch: doc.branch
            });
            
            timelinePromises.push(timeline.save());
          }
        } catch (error) {
          console.error(`Error creating timeline for activity ${activityItem.activity}:`, error);
          // Continue with other activities even if one fails
        }
      }
      
      // Wait for all timelines to be created
      if (timelinePromises.length > 0) {
        await Promise.all(timelinePromises);
        console.log(`Created ${timelinePromises.length} timelines for client ${doc.name}`);
      }
    }
  } catch (error) {
    console.error('Error in client post-save middleware:', error);
  }
});

/**
 * @typedef Client
 */
const Client = mongoose.model('Client', clientSchema);

export default Client; 