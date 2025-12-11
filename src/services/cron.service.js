import cron from 'node-cron';
import { Task } from '../models/index.js';
import { sendEmail, generateDailyReminderHTML } from './email.service.js';
import logger from '../config/logger.js';

/**
 * Send daily reminder emails for pending tasks
 * Runs at 12:50 PM Indian Standard Time (IST) daily
 */
const sendDailyTaskReminders = async () => {
  try {
    logger.info('🕙 Starting daily task reminder process...');
    
    // Get current date in IST
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    logger.info(`📅 Current IST time: ${istTime.toLocaleString()}`);
    
    // Find all pending tasks with team member and timeline details
    const pendingTasks = await Task.find({ status: 'pending' })
      .populate('teamMember', 'name email phone')
      .populate('assignedBy', 'name email')
      .populate('timeline', 'activity client status')
      .populate('branch', 'name location')
      .lean();

    if (pendingTasks.length === 0) {
      logger.info('✅ No pending tasks found for reminders');
      return;
    }

    logger.info(`📋 Found ${pendingTasks.length} pending tasks to send reminders for`);

    // Group tasks by team member
    const tasksByTeamMember = new Map();
    
    pendingTasks.forEach(task => {
      if (task.teamMember && task.teamMember.email) {
        const memberId = task.teamMember._id.toString();
        
        if (!tasksByTeamMember.has(memberId)) {
          tasksByTeamMember.set(memberId, {
            teamMember: task.teamMember,
            tasks: [],
            totalTasks: 0
          });
        }
        
        tasksByTeamMember.get(memberId).tasks.push(task);
        tasksByTeamMember.get(memberId).totalTasks++;
      }
    });

    logger.info(`👥 Sending reminders to ${tasksByTeamMember.size} team members`);

    // Send reminder emails to each team member
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const [memberId, memberData] of tasksByTeamMember) {
      try {
        const { teamMember, tasks, totalTasks } = memberData;
        
        // Generate reminder email content using the new template
        const reminderData = {
          teamMemberName: teamMember.name,
          tasks: tasks,
          totalTasks: totalTasks,
          currentDate: istTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        };

        // Generate HTML email using the new daily reminder template
        const html = generateDailyReminderHTML(reminderData);

        // Create simplified text version for email body
        const taskList = tasks.map((task, index) => {
          const dueDate = task.endDate ? new Date(task.endDate).toLocaleDateString() : 'Not specified';
          const priority = task.priority ? task.priority.toUpperCase() : 'MEDIUM';
          const remarks = task.remarks || 'No description provided';
          
          return `${index + 1}. ${remarks}
   Priority: ${priority}
   Due Date: ${dueDate}
   Branch: ${task.branch?.name || 'Not specified'}`;
        }).join('\n\n');

        const emailBody = `Hello ${teamMember.name}! 👋

You have ${totalTasks} pending task(s) that require your attention:

${taskList}

🚀 Login to your Team Portal: http://crm.vsc.co.in/team-member-login/

Please review and complete these tasks as soon as possible.

Best regards,
Your Task Management System`;

        // Send reminder email
        await sendEmail(
          teamMember.email,
          `📋 Daily Reminder: ${totalTasks} Pending Task${totalTasks > 1 ? 's' : ''} - ${istTime.toLocaleDateString()}`,
          emailBody,
          html
        );

        emailsSent++;
        logger.info(`✅ Reminder email sent to ${teamMember.name} (${teamMember.email}) for ${totalTasks} tasks`);

      } catch (error) {
        emailsFailed++;
        logger.error(`❌ Failed to send reminder email to team member ${memberId}:`, error);
      }
    }

    logger.info(`📧 Daily reminder process completed: ${emailsSent} emails sent, ${emailsFailed} failed`);

  } catch (error) {
    logger.error('❌ Error in daily task reminder process:', error);
  }
};

/**
 * Initialize cron jobs
 */
const initializeCronJobs = () => {
  try {
    logger.info('⏰ Initializing cron jobs...');

    // Schedule daily task reminders at 10:00 AM IST
    // Cron expression: 0 10 * * * (every day at 10:00 AM IST)
    // Since we're using timezone: "Asia/Kolkata", the cron expression should be in IST
    const cronExpression = '0 10 * * *'; // 10:00 AM IST

    cron.schedule(cronExpression, async () => {
      logger.info('🕙 Daily task reminder cron job triggered at 10:00 AM IST');
      await sendDailyTaskReminders();
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

    logger.info('✅ Daily task reminder cron job scheduled for 10:00 AM IST daily');

    // Test the cron job immediately (optional - for testing)
    // Uncomment the line below if you want to test immediately
    // sendDailyTaskReminders();

  } catch (error) {
    logger.error('❌ Error initializing cron jobs:', error);
  }
};

/**
 * Stop all cron jobs
 */
const stopCronJobs = () => {
  try {
    cron.getTasks().forEach(task => {
      task.stop();
    });
    logger.info('⏹️ All cron jobs stopped');
  } catch (error) {
    logger.error('❌ Error stopping cron jobs:', error);
  }
};

/**
 * Get status of cron jobs
 */
const getCronJobStatus = () => {
  try {
    const tasks = cron.getTasks();
    const status = {
      totalJobs: tasks.size,
      runningJobs: 0,
      jobs: []
    };

    tasks.forEach((task, name) => {
      const jobStatus = {
        name,
        running: task.running,
        nextRun: task.nextDate ? task.nextDate().toISOString() : null
      };
      
      if (jobStatus.running) {
        status.runningJobs++;
      }
      
      status.jobs.push(jobStatus);
    });

    return status;
  } catch (error) {
    logger.error('❌ Error getting cron job status:', error);
    return { error: error.message };
  }
};

export {
  initializeCronJobs,
  stopCronJobs,
  getCronJobStatus,
  sendDailyTaskReminders
};
