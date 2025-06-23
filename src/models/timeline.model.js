import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

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
    match: /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
  },
}, { _id: false });

const timelineSchema = mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    clients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    }],
    status: {
      type: String,
      enum: ['pending', 'completed', 'delayed', 'ongoing'],
      required: true,
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
    udin: {
      type: String,
      required: false,
      trim: true,
    },
    turnover: {
      type: Number,
      required: false,
    },
    assignedMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      required: true,
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
timelineSchema.plugin(toJSON);
timelineSchema.plugin(paginate);

/**
 * @typedef Timeline
 */
const Timeline = mongoose.model('Timeline', timelineSchema);

export default Timeline;
