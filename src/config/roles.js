const allRoles = {
  user: ['getTeamMembers', 'manageTeamMembers'],
  admin: ['getUsers', 'manageUsers', 'getTeamMembers', 'manageTeamMembers'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

export { roles, roleRights };
