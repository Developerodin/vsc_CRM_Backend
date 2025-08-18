# Cron Job Installation Guide

## 🚀 **Installation Required**

To use the automatic task reminder cron jobs, you need to install the `node-cron` package:

```bash
npm install node-cron
```

## ⏰ **What This Implements**

### **Daily Task Reminders at 10:00 AM IST**
- Automatically sends reminder emails for all pending tasks
- Runs every day at 10:00 AM Indian Standard Time
- Groups tasks by team member for efficient email delivery
- Beautiful HTML email templates with task details

### **Cron Job Management API**
- **Initialize**: `POST /v1/cron/initialize` - Start cron jobs
- **Stop**: `POST /v1/cron/stop` - Stop all cron jobs  
- **Status**: `GET /v1/cron/status` - Check cron job status
- **Test**: `POST /v1/cron/trigger-reminders` - Manually trigger reminders

## 📧 **Email Content**

Each team member receives a daily email containing:

1. **Summary**: Total number of pending tasks
2. **Task List**: Detailed breakdown of each pending task:
   - Task description/remarks
   - Priority level
   - Due date
   - Branch information
   - Timeline details
3. **Professional Design**: Beautiful HTML template

## 🕙 **Timing Details**

- **Runs**: Daily at 10:00 AM IST
- **Timezone**: Asia/Kolkata (Indian Standard Time)
- **UTC Equivalent**: 4:30 AM UTC (due to IST being UTC+5:30)
- **Automatic**: Starts when server starts, no manual intervention needed

## 🔧 **How It Works**

1. **Server Startup**: Cron jobs automatically initialize when server starts
2. **Daily Schedule**: Runs every day at 10:00 AM IST
3. **Task Query**: Finds all tasks with status 'pending'
4. **Grouping**: Groups tasks by team member
5. **Email Generation**: Creates personalized emails for each team member
6. **Delivery**: Sends emails using existing email service

## 📋 **Example Email**

**Subject**: `📋 Daily Reminder: 3 Pending Task(s) - 15/01/2024`

**Content**:
```
Hello Abhishek,

You have 3 pending task(s) that require your attention:

1. Complete client documentation review
   Priority: HIGH
   Due Date: 20/01/2024
   Branch: Mumbai Branch
   Timeline: 2 timeline(s)

2. Review quarterly reports
   Priority: MEDIUM
   Due Date: 25/01/2024
   Branch: Mumbai Branch

3. Update client contact information
   Priority: LOW
   Due Date: 30/01/2024
   Branch: Mumbai Branch

Please review and complete these tasks as soon as possible.

Best regards,
Your Task Management System
```

## 🚀 **Usage**

### **Automatic (Recommended)**
- Cron jobs start automatically when server starts
- No manual intervention required
- Runs daily at 10:00 AM IST

### **Manual Control**
```bash
# Check cron job status
GET /v1/cron/status

# Manually trigger reminders (for testing)
POST /v1/cron/trigger-reminders

# Stop all cron jobs
POST /v1/cron/stop

# Restart cron jobs
POST /v1/cron/initialize
```

## 🛡️ **Error Handling**

- **Email Failures**: Don't prevent other emails from being sent
- **Database Errors**: Logged but don't crash the cron job
- **Missing Data**: Gracefully handles missing team member emails
- **Logging**: Comprehensive logging for monitoring and debugging

## 📊 **Monitoring**

- **Logs**: All activities logged with timestamps
- **Status API**: Check if cron jobs are running
- **Email Counts**: Track successful vs failed email deliveries
- **Performance**: Monitor execution time and resource usage

## 🔒 **Security**

- **Authentication Required**: All cron management endpoints require auth
- **Role-Based Access**: Only users with 'manageSystem' permission can control cron jobs
- **Read-Only Status**: 'getSystem' permission required to view status

## 📝 **Configuration**

The cron job is configured to:
- **Frequency**: Daily at 10:00 AM IST
- **Timezone**: Asia/Kolkata
- **Max Tasks**: No limit (processes all pending tasks)
- **Email Template**: Uses existing task assignment email template
- **Logging**: Comprehensive logging for monitoring

## ✅ **Benefits**

1. **Automated Reminders**: No manual work required
2. **Improved Productivity**: Team members stay on top of pending work
3. **Professional Communication**: Beautiful, branded emails
4. **Comprehensive Coverage**: All pending tasks included
5. **Time Zone Aware**: Respects Indian Standard Time
6. **Error Resilient**: Continues working even if some emails fail
7. **Easy Management**: Simple API endpoints for control and monitoring

## 🎯 **Next Steps**

1. **Install dependency**: `npm install node-cron`
2. **Restart server**: Cron jobs will start automatically
3. **Monitor logs**: Check server logs for cron job initialization
4. **Test manually**: Use `/v1/cron/trigger-reminders` to test
5. **Monitor daily**: Check logs at 10:00 AM IST for reminder execution

Your team will now receive automatic daily reminders for all pending tasks! 🎉📧
