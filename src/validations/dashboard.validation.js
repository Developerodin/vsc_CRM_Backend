import Joi from 'joi';
import { objectId } from './custom.validation.js';

const getTimelineCountsByBranch = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

const getAssignedTaskCounts = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
  }),
};

export { getTimelineCountsByBranch, getAssignedTaskCounts }; 