/**
 * Seed email templates for every activity and every subactivity.
 * - One template per activity (activity set, subactivity null)
 * - One template per subactivity (activity + subactivity set)
 * Uses upsert by (activity, subactivity) so re-running updates existing or inserts new.
 * Run: node src/scripts/seedActivitySubactivityEmailTemplates.js
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import logger from '../config/logger.js';
import Activity from '../models/activity.model.js';
import EmailTemplate from '../models/emailTemplate.model.js';

const DEFAULT_SUBJECT = 'Reminder: {{activityLabel}}';
const DEFAULT_BODY_TEXT = `Dear {{clientName}},

This is a reminder regarding {{activityLabel}}.

Best regards,
Team`;

/**
 * Build default subject/body for a template (activity only or activity + subactivity).
 * @param {string} activityName
 * @param {string|null} subactivityName
 * @returns {{ subject: string, bodyText: string }}
 */
function defaultContent(activityName, subactivityName) {
  const label = subactivityName ? `${activityName} - ${subactivityName}` : activityName;
  const subject = DEFAULT_SUBJECT.replace('{{activityLabel}}', label);
  const bodyText = DEFAULT_BODY_TEXT.replace(/\{\{activityLabel\}\}/g, label);
  return { subject, bodyText };
}

/**
 * Upsert one email template for the given activity (and optional subactivity).
 */
async function upsertTemplate(activityId, activityName, subactivityId, subactivityName) {
  const filter = {
    activity: new mongoose.Types.ObjectId(activityId),
    subactivity: subactivityId ? new mongoose.Types.ObjectId(subactivityId) : null,
  };
  const { subject, bodyText } = defaultContent(activityName, subactivityName);
  const name = subactivityName ? `${activityName} - ${subactivityName}` : activityName;

  await EmailTemplate.findOneAndUpdate(
    filter,
    {
      $set: {
        name,
        subject,
        bodyText,
        bodyHtml: '',
        branch: null,
        createdBy: null,
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * Create templates for all activities and their subactivities.
 */
async function seedTemplates() {
  const activities = await Activity.find({}).sort({ sortOrder: 1 }).lean();
  let activityCount = 0;
  let subactivityCount = 0;

  for (const activity of activities) {
    const activityId = activity._id.toString();
    const activityName = activity.name || 'Activity';

    // 1. Template for activity (no subactivity)
    await upsertTemplate(activityId, activityName, null, null);
    activityCount += 1;

    // 2. Template for each subactivity
    const subactivities = activity.subactivities || [];
    for (const sub of subactivities) {
      const subId = sub._id ? sub._id.toString() : null;
      const subName = sub.name || 'Subactivity';
      if (subId) {
        await upsertTemplate(activityId, activityName, subId, subName);
        subactivityCount += 1;
      }
    }
  }

  return { activityCount, subactivityCount, total: activityCount + subactivityCount };
}

const run = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');

    const { activityCount, subactivityCount, total } = await seedTemplates();

    logger.info(
      `Seed completed: ${activityCount} activity templates, ${subactivityCount} subactivity templates (${total} total)`
    );
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
};

// Run when executed directly (e.g. node src/scripts/seedActivitySubactivityEmailTemplates.js)
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('seedActivitySubactivityEmailTemplates.js');
if (isDirectRun) {
  run();
}

export { seedTemplates, upsertTemplate, defaultContent };
