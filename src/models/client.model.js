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
    gstNumbers: [{
      state: {
        type: String,
        trim: true,
        required: true,
        description: 'State for which GST number is registered'
      },
      gstNumber: {
        type: String,
        trim: true,
        required: true,
        validate(value) {
          if (value && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
            throw new Error('Invalid GST number format');
          }
        },
        description: 'GST Registration Number for the specific state'
      }
    }],
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
      subactivity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity.subactivities',
        required: false,
        description: 'Reference to specific subactivity (optional)'
      },
      assignedDate: {
        type: Date,
        default: Date.now,
        description: 'Date when the activity was assigned'
      },
      status:{
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        description: 'Status of the activity'
      },
      notes: {
        type: String,
        trim: true,
        description: 'Additional notes for this activity'
      }
    }],
    status:{
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      description: 'Status of the client'
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

// Pre-save middleware to handle activity status when client status changes
clientSchema.pre('save', function(next) {
  // Check if this is an update and status is being changed to inactive
  if (this.isModified('status') && this.status === 'inactive') {
    // Set all activities to inactive
    if (this.activities && this.activities.length > 0) {
      this.activities.forEach(activity => {
        activity.status = 'inactive';
      });
    }
  }
  next();
});

// Pre-update middleware to handle activity status when client status changes via updateOne/findOneAndUpdate
clientSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate();
  
  // Check if status is being updated to inactive
  if (update.status === 'inactive') {
    // Set all activities to inactive
    update.$set = update.$set || {};
    update.$set['activities.$[].status'] = 'inactive';
  }
  
  next();
});

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
          // Get the full activity document to check subactivities
          const Activity = mongoose.model('Activity');
          const activity = await Activity.findById(activityItem.activity);
          
          // Only create timelines if activity has subactivities with frequency
          if (activity && activity.subactivities && activity.subactivities.length > 0) {
            for (const subactivity of activity.subactivities) {
              // Check if specific subactivity is assigned to this client
              const isAssignedSubactivity = activityItem.subactivity && 
                activityItem.subactivity.toString() === subactivity._id.toString();
              
              // If no specific subactivity is assigned, or this is the assigned one
              if (!activityItem.subactivity || isAssignedSubactivity) {
                if (subactivity.frequency && subactivity.frequency !== 'None' && subactivity.frequencyConfig) {
                  // Create recurring timeline for subactivities with frequency
                  const startDate = new Date();
                  const endDate = new Date();
                  endDate.setFullYear(endDate.getFullYear() + 1);
                  
                  const timeline = new Timeline({
                    activity: activity._id,
                    subactivity: subactivity._id,
                    client: doc._id,
                    status: 'pending',
                    startDate: startDate,
                    endDate: endDate,
                    frequency: subactivity.frequency,
                    frequencyConfig: subactivity.frequencyConfig,
                    branch: doc.branch,
                    timelineType: 'recurring'
                  });
                  
                  timelinePromises.push(timeline.save());
                } else {
                  // Create one-time timeline for subactivities without frequency
                  const startDate = new Date();
                  const endDate = new Date();
                  endDate.setDate(endDate.getDate() + 30); // Due in 30 days
                  
                  const timeline = new Timeline({
                    activity: activity._id,
                    subactivity: subactivity._id,
                    client: doc._id,
                    status: 'pending',
                    startDate: startDate,
                    endDate: endDate,
                    frequency: 'OneTime',
                    frequencyConfig: null,
                    branch: doc.branch,
                    timelineType: 'oneTime'
                  });
                  
                  timelinePromises.push(timeline.save());
                }
              }
            }
          } else if (activity && (!activity.subactivities || activity.subactivities.length === 0)) {
            // Handle legacy activities without subactivities - create one-time timeline
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30); // Due in 30 days
            
            const timeline = new Timeline({
              activity: activity._id,
              subactivity: null,
              client: doc._id,
              status: 'pending',
              startDate: startDate,
              endDate: endDate,
              frequency: 'OneTime',
              frequencyConfig: null,
              branch: doc.branch,
              timelineType: 'oneTime'
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