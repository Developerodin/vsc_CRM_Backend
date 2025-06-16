const allRoles = {
  user: ['getTeamMembers', 'manageTeamMembers', 'getActivities', 'manageActivities', 'getBranches', 'manageBranches'],
  admin: ['getUsers', 'manageUsers', 'getTeamMembers', 'manageTeamMembers', 'getActivities', 'manageActivities', 'getBranches', 'manageBranches'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

export { roles, roleRights };
