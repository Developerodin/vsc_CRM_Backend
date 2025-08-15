import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';
import { generateFrequencyPeriods } from '../utils/frequencyGenerator.js';

// Frequency configuration schema based on frequency type
const frequencyConfigSchema = mongoose.Schema({
  // For Hourly: Every [number] hours
  hourlyInterval: {
    type: Number,
    min: 1,
    max: 24,
  },
  
  // For Daily: At time [HH:MM AM/PM]
  dailyTime: {
    type: String,
    // Format: "HH:MM AM/PM" e.g., "09:30 AM", "02:15 PM"
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
  },
  
  // For Weekly: On [Mon, Tue, ...] and At time [HH:MM AM/PM]
  weeklyDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  }],
  weeklyTime: {
    type: String,
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
  },
  
  // For Monthly: Day [1-31] and At time [HH:MM AM/PM]
  monthlyDay: {
    type: Number,
    min: 1,
    max: 31,
  },
  monthlyTime: {
    type: String,
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
  },
  
  // For Quarterly: On Months: [Jan, Apr, Jul, Oct] (or allow selection of custom months in sets of 3)
  quarterlyMonths: [{
    type: String,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  }],
  quarterlyDay: {
    type: Number,
    min: 1,
    max: 31,
  },
  quarterlyTime: {
    type: String,
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
  },
  
  // For Yearly: On [Month] [Date] and At time [HH:MM AM/PM]
  yearlyMonth:[{
    type: String,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  }],
  yearlyDate: {
    type: Number,
    min: 1,
    max: 31,
  },
  yearlyTime: {
    type: String,
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
  },
}, { _id: false });

// Frequency status schema for tracking individual frequency periods
const frequencyStatusSchema = mongoose.Schema({
  period: {
    type: String,
    required: true,
    // For Hourly: "2024-01-15-14" (YYYY-MM-DD-HH)
    // For Daily: "2024-01-15" (YYYY-MM-DD)
    // For Weekly: "2024-W03" (YYYY-WweekNumber)
    // For Monthly: "2024-01" (YYYY-MM)
    // For Quarterly: "2024-Q1" (YYYY-QquarterNumber)
    // For Yearly: "2024-January" (YYYY-MonthName)
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'delayed', 'ongoing'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { _id: false });

const timelineSchema = mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'delayed', 'ongoing'],
      required: true,
      default: 'pending',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: false,
    },
    frequency: {
      type: String,
      enum: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
      required: true,
    },
    frequencyConfig: {
      type: frequencyConfigSchema,
      required: true,
    },
    frequencyStatus: [frequencyStatusSchema],
    udin: [
      {
        fieldName: {
          type: String,
          required: true,
          trim: true,
        },
        udin: {
          type: String,
          required: true,
          trim: true,
        },
        frequency: {
          type: String,
          enum: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
          required: true,
        },
      },
    ],
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate frequency status and update overall status
timelineSchema.pre('save', function(next) {
  // Generate frequency status if frequency, frequencyConfig, startDate, and endDate are present
  if (this.frequency && this.frequencyConfig && this.startDate && this.endDate) {
    // Check if this is a new document or if frequency-related fields have changed
    const isNew = this.isNew;
    const frequencyChanged = this.isModified('frequency') || this.isModified('frequencyConfig') || 
                           this.isModified('startDate') || this.isModified('endDate');
    
    if (isNew || frequencyChanged) {
      try {
        // Generate frequency periods using the utility function
        const periods = generateFrequencyPeriods(
          this.frequency,
          this.frequencyConfig,
          this.startDate,
          this.endDate
        );
        
        // Create frequency status entries for each period
        this.frequencyStatus = periods.map(periodObj => ({
          period: periodObj.period,
          status: 'pending',
          notes: ''
        }));
      } catch (error) {
        console.error('Error generating frequency status:', error);
        // If generation fails, set empty array but don't fail the save
        this.frequencyStatus = [];
      }
    }
  }
  
  // Update overall status based on frequency status
  this.updateOverallStatus();
  next();
});

// Instance method to regenerate frequency status
timelineSchema.methods.regenerateFrequencyStatus = function() {
  if (this.frequency && this.frequencyConfig && this.startDate && this.endDate) {
    try {
      // Generate frequency periods using the utility function
      const periods = generateFrequencyPeriods(
        this.frequency,
        this.frequencyConfig,
        this.startDate,
        this.endDate
      );
      
      // Create frequency status entries for each period
      this.frequencyStatus = periods.map(periodObj => ({
        period: periodObj.period,
        status: 'pending',
        notes: ''
      }));
      
      return this.save();
    } catch (error) {
      return Promise.reject(new Error(`Failed to regenerate frequency status: ${error.message}`));
    }
  }
  return Promise.reject(new Error('Missing required fields for frequency status generation: frequency, frequencyConfig, startDate, or endDate'));
};

// Instance method to update a specific frequency status period
timelineSchema.methods.updateFrequencyStatus = function(period, status, notes = '') {
  const frequencyStatus = this.frequencyStatus.find(fs => fs.period === period);
  if (!frequencyStatus) {
    return Promise.reject(new Error(`Frequency status period '${period}' not found`));
  }
  
  frequencyStatus.status = status;
  frequencyStatus.notes = notes;
  
  if (status === 'completed') {
    frequencyStatus.completedAt = new Date();
  } else {
    frequencyStatus.completedAt = null;
  }
  
  // Update overall timeline status based on frequency status
  this.updateOverallStatus();
  
  return this.save();
};

// Instance method to update overall status based on frequency status
timelineSchema.methods.updateOverallStatus = function() {
  if (this.frequencyStatus && this.frequencyStatus.length > 0) {
    const allCompleted = this.frequencyStatus.every(fs => fs.status === 'completed');
    const anyDelayed = this.frequencyStatus.some(fs => fs.status === 'delayed');
    const anyOngoing = this.frequencyStatus.some(fs => fs.status === 'ongoing');
    
    if (allCompleted) {
      this.status = 'completed';
    } else if (anyDelayed) {
      this.status = 'delayed';
    } else if (anyOngoing) {
      this.status = 'ongoing';
    } else {
      this.status = 'pending';
    }
  }
};

// Static method to regenerate frequency status for multiple timelines
timelineSchema.statics.regenerateAllFrequencyStatus = function() {
  return this.find({
    frequency: { $exists: true },
    frequencyConfig: { $exists: true }
  }).then(timelines => {
    const promises = timelines.map(timeline => timeline.regenerateFrequencyStatus());
    return Promise.all(promises);
  });
};

// add plugin that converts mongoose to json
timelineSchema.plugin(toJSON);
timelineSchema.plugin(paginate);

/**
 * @typedef Timeline
 */
const Timeline = mongoose.model('Timeline', timelineSchema);

export default Timeline;
