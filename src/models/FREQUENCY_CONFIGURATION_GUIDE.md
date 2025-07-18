# Timeline Frequency Configuration Guide

## Overview

The Timeline system in the VSC CRM application provides a comprehensive frequency scheduling system that allows users to create recurring activities with precise timing control. This guide explains how each frequency type works and how to configure them.

## Frequency Types

The system supports 6 different frequency types, each with specific configuration options:

### 1. Hourly Frequency

**Purpose:** Schedule activities at regular hourly intervals throughout the day.

**Configuration Fields:**
- `hourlyInterval`: Number (1-12)

**Validation Rules:**
- Must be greater than 0
- Maximum interval: 12 hours

**UI Components:**
- Dropdown with options 1-12 hours
- Shows "Every X hour(s)" format

**Example Usage:**
```
Frequency: Hourly
Interval: 3 hours
Result: Activity scheduled every 3 hours (9 AM, 12 PM, 3 PM, 6 PM, etc.)
```

**API Data Structure:**
```json
{
  "frequency": "Hourly",
  "frequencyConfig": {
    "hourlyInterval": 3
  }
}
```

### 2. Daily Frequency

**Purpose:** Schedule activities at the same time every day.

**Configuration Fields:**
- `dailyTime`: String (HH:MM format)

**Validation Rules:**
- Time field must not be empty
- Time is converted from 24-hour to 12-hour format for display

**UI Components:**
- Time input field (24-hour format)
- Displays converted 12-hour format in preview

**Example Usage:**
```
Frequency: Daily
Time: 14:30 (2:30 PM)
Result: Activity scheduled every day at 2:30 PM
```

**API Data Structure:**
```json
{
  "frequency": "Daily",
  "frequencyConfig": {
    "dailyTime": "02:30 PM"
  }
}
```

### 3. Weekly Frequency

**Purpose:** Schedule activities on specific days of the week at a designated time.

**Configuration Fields:**
- `weeklyDays`: Array of strings (selected days)
- `weeklyTime`: String (HH:MM format)

**Validation Rules:**
- At least one day must be selected
- Time field must not be empty

**UI Components:**
- Checkboxes for each day (Monday-Sunday)
- Time input field
- Grid layout for day selection

**Example Usage:**
```
Frequency: Weekly
Days: Monday, Wednesday, Friday
Time: 10:00 AM
Result: Activity scheduled every Monday, Wednesday, and Friday at 10 AM
```

**API Data Structure:**
```json
{
  "frequency": "Weekly",
  "frequencyConfig": {
    "weeklyDays": ["Monday", "Wednesday", "Friday"],
    "weeklyTime": "10:00 AM"
  }
}
```

### 4. Monthly Frequency

**Purpose:** Schedule activities on a specific day of every month.

**Configuration Fields:**
- `monthlyDay`: Number (1-31)
- `monthlyTime`: String (HH:MM format)

**Validation Rules:**
- Day must be between 1 and 31
- Time field must not be empty

**UI Components:**
- Dropdown for day selection (1-31)
- Time input field

**Example Usage:**
```
Frequency: Monthly
Day: 15
Time: 3:00 PM
Result: Activity scheduled on the 15th of every month at 3 PM
```

**API Data Structure:**
```json
{
  "frequency": "Monthly",
  "frequencyConfig": {
    "monthlyDay": 15,
    "monthlyTime": "03:00 PM"
  }
}
```

### 5. Quarterly Frequency

**Purpose:** Schedule activities on specific months of the year (quarterly basis).

**Configuration Fields:**
- `quarterlyMonths`: Array of strings (selected months)
- `quarterlyDay`: Number (1-31)
- `quarterlyTime`: String (HH:MM format)

**Validation Rules:**
- At least one month must be selected
- Day must be between 1 and 31
- Time field must not be empty

**UI Components:**
- Checkboxes for quarter months (January, April, July, October)
- Dropdown for day selection (1-31)
- Time input field

**Example Usage:**
```
Frequency: Quarterly
Months: January, April, July, October
Day: 1
Time: 9:00 AM
Result: Activity scheduled on the 1st of January, April, July, and October at 9 AM
```

**API Data Structure:**
```json
{
  "frequency": "Quarterly",
  "frequencyConfig": {
    "quarterlyMonths": ["January", "April", "July", "October"],
    "quarterlyDay": 1,
    "quarterlyTime": "09:00 AM"
  }
}
```

### 6. Yearly Frequency

**Purpose:** Schedule activities on specific months and days of the year.

**Configuration Fields:**
- `yearlyMonth`: Array of strings (selected months)
- `yearlyDate`: Number (1-31)
- `yearlyTime`: String (HH:MM format)

**Validation Rules:**
- At least one month must be selected
- Day must be between 1 and 31
- Time field must not be empty

**UI Components:**
- Checkboxes for all 12 months
- Dropdown for day selection (1-31)
- Time input field

**Example Usage:**
```
Frequency: Yearly
Months: January, March, May, July, September, November
Day: 18
Time: 2:12 PM
Result: Activity scheduled on the 18th of January, March, May, July, September, and November every year at 2:12 PM
```

**API Data Structure:**
```json
{
  "frequency": "Yearly",
  "frequencyConfig": {
    "yearlyMonth": ["January", "March", "May", "July", "September", "November"],
    "yearlyDate": 18,
    "yearlyTime": "02:12 PM"
  }
}
```

**Generated Periods:**
For the above configuration with date range 2025-07-19 to 2028-09-18:
- 2025-September, 2025-November
- 2026-January, 2026-March, 2026-May, 2026-July, 2026-September, 2026-November
- 2027-January, 2027-March, 2027-May, 2027-July, 2027-September, 2027-November
- 2028-January, 2028-March, 2028-May, 2028-July, 2028-September
```

## Technical Implementation

### State Management

The frequency configuration is managed through React state:

```typescript
const [formData, setFormData] = useState({
  frequency: '',
  frequencyConfig: {
    hourlyInterval: 1,
    dailyTime: '',
    weeklyDays: [],
    weeklyTime: '',
    monthlyDay: 1,
    monthlyTime: '',
    quarterlyMonths: [],
    quarterlyDay: 1,
    quarterlyTime: '',
    yearlyMonth: [],
    yearlyDate: 1,
    yearlyTime: ''
  }
});
```

### Validation System

Each frequency type has specific validation rules:

```typescript
const validateFrequencyConfig = () => {
  const { frequency, frequencyConfig } = formData;
  
  switch (frequency) {
    case 'Hourly':
      return frequencyConfig.hourlyInterval > 0;
    case 'Daily':
      return frequencyConfig.dailyTime !== '';
    case 'Weekly':
      return frequencyConfig.weeklyDays.length > 0 && frequencyConfig.weeklyTime !== '';
    case 'Monthly':
      return frequencyConfig.monthlyDay > 0 && frequencyConfig.monthlyDay <= 31 && frequencyConfig.monthlyTime !== '';
    case 'Quarterly':
      return frequencyConfig.quarterlyMonths.length > 0 && frequencyConfig.quarterlyDay > 0 && frequencyConfig.quarterlyDay <= 31 && frequencyConfig.quarterlyTime !== '';
    case 'Yearly':
      return frequencyConfig.yearlyMonth.length > 0 && frequencyConfig.yearlyDate > 0 && frequencyConfig.yearlyDate <= 31 && frequencyConfig.yearlyTime !== '';
    default:
      return false;
  }
};
```

### Time Format Conversion

The system converts between 24-hour and 12-hour time formats:

```typescript
const formatTimeForAPI = (timeString: string) => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};
```

### Dynamic Configuration Modal

The frequency configuration modal dynamically shows relevant options:

```typescript
{formData.frequency === 'Hourly' && (
  <div className="space-y-4">
    <div className="form-group">
      <label className="form-label">Hourly Interval <span className="text-red-500">*</span></label>
      <select
        className="form-select"
        value={formData.frequencyConfig.hourlyInterval}
        onChange={(e) => handleFrequencyConfigChange('hourlyInterval', parseInt(e.target.value) || 1)}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
          <option key={hour} value={hour}>
            Every {hour} hour{hour > 1 ? 's' : ''}
          </option>
        ))}
      </select>
    </div>
  </div>
)}
```

### Preview Generation

The system generates human-readable previews of scheduled activities:

```typescript
const generatePreviewText = () => {
  // ... validation checks ...
  
  let frequencyText = '';
  const { frequencyConfig } = formData;

  switch (formData.frequency) {
    case 'Hourly':
      frequencyText = `every ${frequencyConfig.hourlyInterval} hour${frequencyConfig.hourlyInterval > 1 ? 's' : ''}`;
      break;
    case 'Daily':
      const dailyTime = frequencyConfig.dailyTime ? formatTimeForAPI(frequencyConfig.dailyTime) : 'specified time';
      frequencyText = `every day at ${dailyTime}`;
      break;
    // ... other cases ...
  }

  return `${activity?.name} activity will be created ${frequencyText} for ${clients}${dateRange ? `, ${dateRange}` : ''}`;
};
```

### API Data Preparation

Only relevant frequency configuration is sent to the API:

```typescript
const includeSelectedFrequency = (frequency: string, frequencyConfig: any) => {
  const frequencyConfigObject: any = {};
  switch (formData.frequency) {
    case 'Hourly':
      frequencyConfigObject['hourlyInterval'] = formData.frequencyConfig.hourlyInterval;
      break;
    case 'Daily':
      frequencyConfigObject['dailyTime'] = frequencyConfig.dailyTime;
      break;
    case 'Weekly':
      frequencyConfigObject['weeklyDays'] = formData.frequencyConfig.weeklyDays;
      frequencyConfigObject['weeklyTime'] = frequencyConfig.weeklyTime;
      break;
    // ... other cases ...
  }
  return frequencyConfigObject;
};
```

## User Interface Features

### 1. Status Indicators

The system provides visual feedback on configuration status:

- **Not configured**: Gray text when no frequency is selected
- **Configured**: Green text when all required fields are filled
- **Incomplete**: Red text when required fields are missing

### 2. Modal-based Configuration

- Opens when user selects a frequency type
- Shows only relevant configuration options
- Real-time validation feedback
- Save/Cancel actions

### 3. Preview System

- Shows human-readable description of scheduled activity
- Updates in real-time as configuration changes
- Includes activity name, frequency, clients, and date range

### 4. Form Integration

- Integrates with main timeline form
- Validates frequency configuration before form submission
- Cleans up empty fields before API submission

## Best Practices

### 1. User Experience

- Always provide clear validation messages
- Show preview text to help users understand their configuration
- Use consistent time format display
- Provide helpful tooltips and descriptions

### 2. Data Validation

- Validate all required fields before submission
- Ensure date ranges are logical (end date >= start date)
- Check for valid time formats
- Validate day ranges (1-31 for monthly frequencies)

### 3. API Integration

- Only send relevant frequency configuration data
- Convert time formats appropriately
- Handle empty or invalid configurations gracefully
- Provide meaningful error messages

### 4. Performance

- Use debounced search for client selection
- Implement proper loading states
- Cache frequently used data (activities, groups, team members)
- Optimize modal rendering for large datasets

## Common Use Cases

### 1. Daily Standups
- **Frequency**: Daily
- **Time**: 9:00 AM
- **Use Case**: Team meetings, status updates

### 2. Weekly Reviews
- **Frequency**: Weekly
- **Days**: Friday
- **Time**: 2:00 PM
- **Use Case**: Weekly progress reviews, client check-ins

### 3. Monthly Reports
- **Frequency**: Monthly
- **Day**: 1
- **Time**: 10:00 AM
- **Use Case**: Monthly reporting, billing cycles

### 4. Quarterly Planning
- **Frequency**: Quarterly
- **Months**: January, April, July, October
- **Day**: 15
- **Time**: 1:00 PM
- **Use Case**: Strategic planning sessions

### 5. Annual Events
- **Frequency**: Yearly
- **Months**: December
- **Day**: 25
- **Time**: 12:00 PM
- **Use Case**: Holiday schedules, annual reviews

## Troubleshooting

### Common Issues

1. **Time not saving**: Ensure time field is not empty and in correct format
2. **Days not selected**: Check that at least one day is selected for weekly frequency
3. **Invalid dates**: Ensure day selection is within valid range (1-31)
4. **Preview not showing**: Verify all required fields are filled and validation passes

### Debug Tips

- Check browser console for validation errors
- Verify frequency configuration state in React DevTools
- Test with different frequency types to isolate issues
- Ensure API endpoint accepts the frequency configuration format

## Conclusion

The frequency configuration system provides a flexible and user-friendly way to schedule recurring activities. By understanding the different frequency types and their configuration options, users can effectively manage their timeline schedules and ensure activities are created at the appropriate intervals.

The system's modular design allows for easy extension and maintenance, while the comprehensive validation ensures data integrity and user experience quality. 