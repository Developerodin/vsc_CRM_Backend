import mongoose from 'mongoose';
import toJSON from './plugins/toJSON.plugin.js';
import paginate from './plugins/paginate.plugin.js';

/**
 * Supported placeholders in subject/bodyText (per recipient):
 * {{clientName}}, {{email}}, {{email2}}, {{phone}}, {{address}}, {{district}}, {{state}}, {{companyName}}
 * Emails are sent as plain text only. bodyHtml is optional (e.g. for future/display).
 */
const emailTemplateSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    bodyText: {
      type: String,
      default: '',
      trim: true,
    },
    bodyHtml: {
      type: String,
      default: '',
      trim: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    /** Link to activity (optional). When set, template is for this activity (and optionally a subactivity). */
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      default: null,
    },
    /** Subactivity ID (optional). When set with activity, template is for this activity+subactivity. */
    subactivity: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ branch: 1 });
emailTemplateSchema.index({ name: 1, branch: 1 });
emailTemplateSchema.index({ activity: 1, subactivity: 1 });
emailTemplateSchema.plugin(toJSON);
emailTemplateSchema.plugin(paginate);

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
export default EmailTemplate;
