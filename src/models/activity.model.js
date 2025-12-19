import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

const frequencyConfigSchema = mongoose.Schema({
  // For Hourly: Every [number] hours
  hourlyInterval: {
    type: Number,
    min: 1,
    max: 24,
  },
  
  // For Daily: At time [HH:MM AM/PM] or [HH:MM] (24-hour)
  dailyTime: {
    type: String,
    // Format: "HH:MM AM/PM" e.g., "09:30 AM", "02:15 PM" or "17:07" (24-hour)
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  
  // For Weekly: On [Mon, Tue, ...] and At time [HH:MM AM/PM]
  weeklyDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  }],
  weeklyTime: {
    type: String,
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  
  // For Monthly: Day [1-31] and At time [HH:MM AM/PM]
  monthlyDay: {
    type: Number,
    min: 1,
    max: 31,
  },
  monthlyTime: {
    type: String,
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
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
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  
  // For Yearly: On [Month] [Date] and At time [HH:MM AM/PM]
  yearlyMonth: {
    type: String,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  yearlyDate: {
    type: Number,
    min: 1,
    max: 31,
  },
  yearlyTime: {
    type: String,
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
  },
}, { _id: false });

const subactivitySchema = mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true,
  },
  dueDate: {
    type: Date,
    required: false,
  },
  frequency: {
    type: String,
    enum: ['None', 'OneTime', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
    required: false,
    default: 'None',
  },
  frequencyConfig: {
    type: frequencyConfigSchema,
    required: false,
  },
  fields: [{
    name: {
      type: String,
      required: false,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'email', 'phone', 'url', 'select', 'textarea', 'checkbox', 'radio'],
      required: false,
      default: 'text',
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: [{
      type: String,
      trim: false,
    }], // For select, radio types
    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    placeholder: {
      type: String,
      trim: false,
    },
    validation: {
      minLength: Number,
      maxLength: Number,
      min: Number,
      max: Number,
      pattern: String, // Regex pattern for validation
    },
  }],
}, { 
  timestamps: true,
  _id: true 
});

const activitySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sortOrder: {
      type: Number,
      required: true,
    },
    subactivities: [subactivitySchema]
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
activitySchema.index({ name: 1 }); // For activity name searches

// add plugin that converts mongoose to json
activitySchema.plugin(toJSON);
activitySchema.plugin(paginate);

/**
 * @typedef Activity
 */
const Activity = mongoose.model('Activity', activitySchema);

export default Activity; 