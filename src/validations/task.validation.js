import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createTask = {
  body: Joi.object().keys({
    teamMember: Joi.string().custom(objectId).required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent', 'critical').default('medium'),
    branch: Joi.string().custom(objectId).required(),
    assignedBy: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.string().allow('').empty('')
    ),
    timeline: Joi.array().items(Joi.string().custom(objectId)),
    remarks: Joi.string().max(1000),
    status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed').default('pending'),
    metadata: Joi.object(),
    attachments: Joi.array().items(
      Joi.object({
        fileName: Joi.string().required(),
        fileUrl: Joi.string().uri().required(),
        uploadedAt: Joi.date()
      })
    )
  }),
};

const getTasks = {
  query: Joi.object().keys({
    teamMember: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.string().allow('').empty('')
    ),
    assignedBy: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.string().allow('').empty('')
    ),
    timeline: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.array().items(Joi.string().custom(objectId)),
      Joi.string().allow('').empty('')
    ),
    branch: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.string().allow('').empty('')
    ),
    status: Joi.alternatives().try(
      Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed'),
      Joi.string().allow('').empty('')
    ),
    priority: Joi.alternatives().try(
      Joi.string().valid('low', 'medium', 'high', 'urgent', 'critical'),
      Joi.string().allow('').empty('')
    ),
    startDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().allow('').empty('')
    ),
    endDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().allow('').empty('')
    ),
    startDateRange: Joi.alternatives().try(
      Joi.date(),
      Joi.string().allow('').empty('')
    ),
    endDateRange: Joi.alternatives().try(
      Joi.date(),
      Joi.string().allow('').empty('')
    ),
    today: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false').empty('')
    ),
    search: Joi.string().allow('', null),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTask = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required(),
  }),
};

const updateTask = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      teamMember: Joi.string().custom(objectId),
      startDate: Joi.date(),
      endDate: Joi.date().when('startDate', {
        is: Joi.exist(),
        then: Joi.date().min(Joi.ref('startDate')),
        otherwise: Joi.date()
      }),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent', 'critical'),
      branch: Joi.string().custom(objectId),
      assignedBy: Joi.alternatives().try(
        Joi.string().custom(objectId),
        Joi.string().allow('').empty('')
      ),
      timeline: Joi.array().items(Joi.string().custom(objectId)),
      remarks: Joi.string().max(1000),
      status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed'),
      metadata: Joi.object(),
      attachments: Joi.array().items(
        Joi.object({
          fileName: Joi.string().required(),
          fileUrl: Joi.string().uri().required(),
          uploadedAt: Joi.date()
        })
      )
    })
    .min(1),
};

const deleteTask = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required(),
  }),
};

const getTasksByTeamMember = {
  params: Joi.object().keys({
    teamMemberId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksByTimeline = {
  params: Joi.object().keys({
    timelineId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksByAssignedBy = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksByBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksByStatus = {
  params: Joi.object().keys({
    status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed').required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksByPriority = {
  params: Joi.object().keys({
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent', 'critical').required(),
  }),
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksByDateRange = {
  query: Joi.object().keys({
    startDate: Joi.date().required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getOverdueTasks = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getHighPriorityTasks = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksDueToday = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksDueThisWeek = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTasksDueThisMonth = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const searchTasks = {
  query: Joi.object().keys({
    q: Joi.string().min(1).required(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTaskStatistics = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId),
  }),
};

const bulkUpdateTaskStatus = {
  body: Joi.object().keys({
    taskIds: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
    status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed').required(),
  }),
};

const bulkDeleteTasks = {
  body: Joi.object().keys({
    taskIds: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
  }),
};

const bulkCreateTasks = {
  body: Joi.object().keys({
    tasks: Joi.array().items(
      Joi.object().keys({
        teamMember: Joi.string().custom(objectId).required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().min(Joi.ref('startDate')).required(),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent', 'critical').default('medium'),
        branch: Joi.string().custom(objectId).required(),
        assignedBy: Joi.alternatives().try(
          Joi.string().custom(objectId),
          Joi.string().allow('').empty('')
        ),
        timeline: Joi.array().items(Joi.string().custom(objectId)),
        remarks: Joi.string().max(1000),
        status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed').default('pending'),
        metadata: Joi.object(),
        attachments: Joi.array().items(
          Joi.object({
            fileName: Joi.string().required(),
            fileUrl: Joi.string().uri().required(),
            uploadedAt: Joi.date()
          })
        )
      })
    ).min(1).max(100).required(),
  }),
};

const addAttachment = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    fileName: Joi.string().required(),
    fileUrl: Joi.string().uri().required(),
  }),
};

const removeAttachment = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required(),
    fileName: Joi.string().required(),
  }),
};

export default {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getTasksByTeamMember,
  getTasksByTimeline,
  getTasksByAssignedBy,
  getTasksByBranch,
  getTasksByStatus,
  getTasksByPriority,
  getTasksByDateRange,
  getOverdueTasks,
  getHighPriorityTasks,
  getTasksDueToday,
  getTasksDueThisWeek,
  getTasksDueThisMonth,
  searchTasks,
  getTaskStatistics,
  bulkCreateTasks,
  bulkUpdateTaskStatus,
  bulkDeleteTasks,
  addAttachment,
  removeAttachment,
};
