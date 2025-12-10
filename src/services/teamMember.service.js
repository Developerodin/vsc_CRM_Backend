import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import TeamMember from '../models/teamMember.model.js';
import Activity from '../models/activity.model.js';
import Branch from '../models/branch.model.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';
import cache from '../utils/cache.js';

/**
 * Validate if all skill IDs exist in the activities collection
 * @param {string[]} skillIds
 * @returns {Promise<boolean>}
 */
const validateSkills = async (skillIds) => {
  if (!Array.isArray(skillIds)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Skills must be an array');
  }
  if (skillIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'At least one skill is required');
  }
  // Find all activities with the given IDs
  const activities = await Activity.find({ _id: { $in: skillIds } });
  // Check if we found all the activities (no duplicates or invalid IDs)
  if (activities.length !== skillIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more skills are invalid');
  }
  return true;
};

/**
 * Validate if branch ID exists
 * @param {string} branchId
 * @returns {Promise<boolean>}
 */
const validateBranch = async (branchId) => {
  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid branch ID format');
  }
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Branch not found');
  }
  return true;
};

/**
 * Create a team member
 * @param {Object} teamMemberBody
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<TeamMember>}
 */
const createTeamMember = async (teamMemberBody, user = null) => {
  if (await TeamMember.isEmailTaken(teamMemberBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (await TeamMember.isPhoneTaken(teamMemberBody.phone)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  await validateSkills(teamMemberBody.skills);
  await validateBranch(teamMemberBody.branch);
  
  // Validate branch access if user is provided
  if (user && user.role && teamMemberBody.branch) {
    if (!hasBranchAccess(user.role, teamMemberBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
  const teamMember = await TeamMember.create(teamMemberBody);
  return teamMember.populate(['skills', 'branch']);
};

/**
 * Query for team members
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (if not provided, returns all results)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {Object} user - User object with role information
 * @returns {Promise<QueryResult>}
 */
const queryTeamMembers = async (filter, options, user) => {
  // Check cache first for simple queries
  const cacheKey = cache.generateKey('team-members', { 
    filter: JSON.stringify(filter),
    options: JSON.stringify(options),
    userId: user?._id?.toString() || 'anonymous'
  });
  
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Create a new filter object to avoid modifying the original
  const mongoFilter = { ...filter };
  
  // Remove empty or null values from filter
  Object.keys(mongoFilter).forEach(key => {
    if (mongoFilter[key] === '' || mongoFilter[key] === null || mongoFilter[key] === undefined) {
      delete mongoFilter[key];
    }
  });
  
  // Handle global search across multiple fields
  if (mongoFilter.search && mongoFilter.search.trim() !== '') {
    const searchValue = mongoFilter.search.trim();
    const searchRegex = { $regex: searchValue, $options: 'i' };
    
    // Create an $or condition to search across multiple fields
    mongoFilter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { city: searchRegex },
      { state: searchRegex },
      { country: searchRegex },
    ];
    
    // Remove the search parameter as it's now handled by $or
    delete mongoFilter.search;

  }
  
  // Handle individual field filters (only if no global search)
  if (!mongoFilter.$or) {
    // If name filter exists, convert it to case-insensitive regex
    if (mongoFilter.name && mongoFilter.name.trim() !== '') {
      mongoFilter.name = { $regex: mongoFilter.name.trim(), $options: 'i' };
    }
    
    // If email filter exists, convert it to case-insensitive regex
    if (mongoFilter.email && mongoFilter.email.trim() !== '') {
      mongoFilter.email = { $regex: mongoFilter.email.trim(), $options: 'i' };
    }
    
    // If phone filter exists, convert it to case-insensitive regex
    if (mongoFilter.phone && mongoFilter.phone.trim() !== '') {
      mongoFilter.phone = { $regex: mongoFilter.phone.trim(), $options: 'i' };
    }
    
    // If city filter exists, convert it to case-insensitive regex
    if (mongoFilter.city && mongoFilter.city.trim() !== '') {
      mongoFilter.city = { $regex: mongoFilter.city.trim(), $options: 'i' };
    }
    
    // If state filter exists, convert it to case-insensitive regex
    if (mongoFilter.state && mongoFilter.state.trim() !== '') {
      mongoFilter.state = { $regex: mongoFilter.state.trim(), $options: 'i' };
    }
    
    // If country filter exists, convert it to case-insensitive regex
    if (mongoFilter.country && mongoFilter.country.trim() !== '') {
      mongoFilter.country = { $regex: mongoFilter.country.trim(), $options: 'i' };
    }
  }

  // Apply branch filtering based on user's access
  if (user && user.role) {
    // If specific branch is requested in filter
    if (mongoFilter.branch) {
      // Check if user has access to this specific branch
      if (!hasBranchAccess(user.role, mongoFilter.branch)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    } else {
      // Get user's allowed branch IDs
      const allowedBranchIds = getUserBranchIds(user.role);
      
      if (allowedBranchIds === null) {
        // User has access to all branches, no filtering needed
      } else if (allowedBranchIds.length > 0) {
        // Filter by user's allowed branches
        mongoFilter.branch = { $in: allowedBranchIds };
      } else {
        // User has no branch access
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  const teamMembers = await TeamMember.paginate(mongoFilter, {
    ...options,
    populate: [
      { path: 'skills', select: 'name category' }, // Only select necessary fields
      { path: 'branch', select: 'name city state' } // Only select necessary fields
    ],
    sortBy: options.sortBy || 'sortOrder:asc',
  });

  // Cache the result for 2 minutes
  cache.set(cacheKey, teamMembers, 2 * 60 * 1000);

  return teamMembers;
};

/**
 * Get team member by id
 * @param {ObjectId} id
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid team member ID format');
  }
  const teamMember = await TeamMember.findById(id).populate(['skills', 'branch']);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  return teamMember;
};

/**
 * Get team member by phone
 * @param {string} phone
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberByPhone = async (phone) => {
  const teamMember = await TeamMember.findOne({ phone }).populate(['skills', 'branch']);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  return teamMember;
};

/**
 * Get team member by email
 * @param {string} email
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberByEmail = async (email) => {
  const teamMember = await TeamMember.findOne({ email }).populate(['skills', 'branch']);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  return teamMember;
};

/**
 * Update team member by id
 * @param {ObjectId} teamMemberId
 * @param {Object} updateBody
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<TeamMember>}
 */
const updateTeamMemberById = async (teamMemberId, updateBody, user = null) => {
  const teamMember = await getTeamMemberById(teamMemberId);
  
  if (updateBody.email && (await TeamMember.isEmailTaken(updateBody.email, teamMemberId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.phone && (await TeamMember.isPhoneTaken(updateBody.phone, teamMemberId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  if (updateBody.skills) {
    await validateSkills(updateBody.skills);
  }
  if (updateBody.branch) {
    await validateBranch(updateBody.branch);
    
    // Validate branch access if user is provided
    if (user && user.role) {
      if (!hasBranchAccess(user.role, updateBody.branch)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    }
  }
  
  Object.assign(teamMember, updateBody);
  await teamMember.save();
  return teamMember.populate(['skills', 'branch']);
};

/**
 * Delete team member by id
 * @param {ObjectId} teamMemberId
 * @returns {Promise<TeamMember>}
 */
const deleteTeamMemberById = async (teamMemberId) => {
  const teamMember = await getTeamMemberById(teamMemberId);
  await teamMember.deleteOne();
  return teamMember;
};

/**
 * Bulk import team members (create and update)
 * @param {Array} teamMembers - Array of team member objects with optional id for updates
 * @returns {Promise<Object>} - Result with created and updated counts
 */
const bulkImportTeamMembers = async (teamMembers) => {
  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };

  // Separate team members for creation and update
  const toCreate = teamMembers.filter((teamMember) => !teamMember.id);
  const toUpdate = teamMembers.filter((teamMember) => teamMember.id);

  // Handle bulk creation with validation
  if (toCreate.length > 0) {
    try {
      // Validate unique fields before bulk insert
      const emailValidationPromises = toCreate.map(async (teamMember, index) => {
        if (await TeamMember.isEmailTaken(teamMember.email)) {
          return { index, field: 'email', value: teamMember.email };
        }
        return null;
      });

      const phoneValidationPromises = toCreate.map(async (teamMember, index) => {
        if (await TeamMember.isPhoneTaken(teamMember.phone)) {
          return { index, field: 'phone', value: teamMember.phone };
        }
        return null;
      });

      const [emailErrors, phoneErrors] = await Promise.all([
        Promise.all(emailValidationPromises),
        Promise.all(phoneValidationPromises),
      ]);

      const validationErrors = [...emailErrors, ...phoneErrors].filter(Boolean);

      // Validate branch and skills for all team members to be created
      const allBranchIds = toCreate.map(tm => tm.branch);
      const allSkillIds = toCreate.reduce((ids, tm) => {
        if (tm.skills && tm.skills.length > 0) {
          ids.push(...tm.skills);
        }
        return ids;
      }, []);

      const uniqueBranchIds = [...new Set(allBranchIds)];
      const uniqueSkillIds = [...new Set(allSkillIds)];

      // Validate branches
      const validBranches = await Branch.find({ _id: { $in: uniqueBranchIds } });
      const validBranchIds = validBranches.map((branch) => branch._id.toString());
      const invalidBranchIds = uniqueBranchIds.filter((id) => !validBranchIds.includes(id));

      // Validate skills
      const validSkills = await Activity.find({ _id: { $in: uniqueSkillIds } });
      const validSkillIds = validSkills.map((skill) => skill._id.toString());
      const invalidSkillIds = uniqueSkillIds.filter((id) => !validSkillIds.includes(id));

      // Add validation errors for invalid branches and skills
      if (invalidBranchIds.length > 0) {
        invalidBranchIds.forEach((invalidBranchId) => {
          const teamMembersWithInvalidBranch = toCreate.filter((tm) => tm.branch === invalidBranchId);
          teamMembersWithInvalidBranch.forEach((tm) => {
            validationErrors.push({
              index: toCreate.indexOf(tm),
              field: 'branch',
              value: invalidBranchId,
            });
          });
        });
      }

      if (invalidSkillIds.length > 0) {
        invalidSkillIds.forEach((invalidSkillId) => {
          const teamMembersWithInvalidSkill = toCreate.filter((tm) =>
            tm.skills && tm.skills.includes(invalidSkillId)
          );
          teamMembersWithInvalidSkill.forEach((tm) => {
            validationErrors.push({
              index: toCreate.indexOf(tm),
              field: 'skills',
              value: invalidSkillId,
            });
          });
        });
      }

      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => {
          results.errors.push({
            index: error.index,
            error: `${error.field} already taken or invalid: ${error.value}`,
            data: toCreate[error.index],
          });
        });
        // Remove team members with validation errors from creation
        const validTeamMembers = toCreate.filter((_, index) =>
          !validationErrors.some(error => error.index === index)
        );

        if (validTeamMembers.length > 0) {
          const createdTeamMembers = await TeamMember.insertMany(validTeamMembers, {
            ordered: false,
            rawResult: true,
          });
          results.created = createdTeamMembers.insertedCount || validTeamMembers.length;
        }
      } else {
        const createdTeamMembers = await TeamMember.insertMany(toCreate, {
          ordered: false,
          rawResult: true,
        });
        results.created = createdTeamMembers.insertedCount || toCreate.length;
      }
    } catch (error) {
      if (error.writeErrors) {
        // Handle partial failures
        results.created = (error.insertedDocs && error.insertedDocs.length) || 0;
        error.writeErrors.forEach((writeError) => {
          results.errors.push({
            index: writeError.index,
            error: writeError.err.errmsg || 'Creation failed',
            data: toCreate[writeError.index],
          });
        });
      } else {
        throw error;
      }
    }
  }

  // Handle bulk updates
  if (toUpdate.length > 0) {
    const updateOps = toUpdate.map((teamMember) => ({
      updateOne: {
        filter: { _id: teamMember.id },
        update: {
          $set: {
            name: teamMember.name,
            email: teamMember.email,
            phone: teamMember.phone,
            address: teamMember.address,
            city: teamMember.city,
            state: teamMember.state,
            country: teamMember.country,
            pinCode: teamMember.pinCode,
            branch: teamMember.branch,
            sortOrder: teamMember.sortOrder,
            skills: teamMember.skills,
          },
        },
        upsert: false,
      },
    }));

    try {
      const updateResult = await TeamMember.bulkWrite(updateOps, {
        ordered: false, // Continue processing even if some fail
      });
      results.updated = updateResult.modifiedCount || 0;
    } catch (error) {
      if (error.writeErrors) {
        // Handle partial failures
        results.updated = error.modifiedCount || 0;
        error.writeErrors.forEach((writeError) => {
          results.errors.push({
            index: writeError.index,
            error: writeError.err.errmsg || 'Update failed',
            data: toUpdate[writeError.index],
          });
        });
      } else {
        throw error;
      }
    }
  }

  return results;
};

export {
  createTeamMember,
  queryTeamMembers,
  getTeamMemberById,
  getTeamMemberByEmail,
  getTeamMemberByPhone,
  updateTeamMemberById,
  deleteTeamMemberById,
  bulkImportTeamMembers,
}; 