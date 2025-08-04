import request from 'supertest';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import setupTestDB from '../utils/setupTestDB.js';
import { User } from '../../src/models/index.js';
import { userOne, insertUsers } from '../fixtures/user.fixture.js';
import { getAccessToken } from '../fixtures/token.fixture.js';
import * as roleService from '../../src/services/role.service.js';

setupTestDB();

// Helper function to create test permissions
const createTestPermissions = () => {
  const availableNavigationPermissions = roleService.getAvailableNavigationPermissions();
  const availableApiPermissions = roleService.getAvailableApiPermissions();
  
  const navigationPermissions = {};
  const apiPermissions = {};
  
  // Set navigation permissions
  Object.keys(availableNavigationPermissions).forEach(key => {
    if (key === 'settings') {
      navigationPermissions[key] = {};
      Object.keys(availableNavigationPermissions[key].children || {}).forEach(childKey => {
        navigationPermissions[key][childKey] = false;
      });
    } else {
      navigationPermissions[key] = false;
    }
  });
  
  // Set API permissions
  Object.keys(availableApiPermissions).forEach(key => {
    apiPermissions[key] = false;
  });
  
  // Set some test permissions to true
  if (navigationPermissions.dashboard !== undefined) navigationPermissions.dashboard = true;
  if (navigationPermissions.clients !== undefined) navigationPermissions.clients = true;
  if (navigationPermissions.fileManager !== undefined) navigationPermissions.fileManager = true;
  if (apiPermissions.getTeamMembers !== undefined) apiPermissions.getTeamMembers = true;
  if (apiPermissions.getActivities !== undefined) apiPermissions.getActivities = true;
  if (apiPermissions.getBranches !== undefined) apiPermissions.getBranches = true;
  if (apiPermissions.getClients !== undefined) apiPermissions.getClients = true;
  if (apiPermissions.getGroups !== undefined) apiPermissions.getGroups = true;
  if (apiPermissions.getFileManager !== undefined) apiPermissions.getFileManager = true;
  
  return { navigationPermissions, apiPermissions };
};

describe('Role routes', () => {
  describe('POST /v1/roles', () => {
    test('should return 201 and successfully create role if data is ok', async () => {
      await insertUsers([userOne]);
      const accessToken = await getAccessToken(userOne);

      const { navigationPermissions, apiPermissions } = createTestPermissions();

      const newRole = {
        name: 'Test Role',
        description: 'Test role description',
        navigationPermissions,
        apiPermissions,
        allBranchesAccess: false,
        isActive: true,
      };

      const res = await request(app)
        .post('/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newRole)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual({
        id: expect.anything(),
        name: newRole.name,
        description: newRole.description,
        navigationPermissions: newRole.navigationPermissions,
        apiPermissions: newRole.apiPermissions,
        branchAccess: [],
        allBranchesAccess: newRole.allBranchesAccess,
        isActive: newRole.isActive,
        createdBy: userOne._id.toHexString(),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
    });

    test('should return 400 error if role name is already taken', async () => {
      await insertUsers([userOne]);
      const accessToken = await getAccessToken(userOne);

      const { navigationPermissions, apiPermissions } = createTestPermissions();

      const newRole = {
        name: 'Test Role',
        description: 'Test role description',
        navigationPermissions,
        apiPermissions,
      };

      await request(app)
        .post('/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newRole)
        .expect(httpStatus.CREATED);

      await request(app)
        .post('/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newRole)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/roles', () => {
    test('should return 200 and apply default filter options', async () => {
      await insertUsers([userOne]);
      const accessToken = await getAccessToken(userOne);

      const res = await request(app)
        .get('/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: expect.any(Number),
      });
    });
  });

  describe('GET /v1/roles/permissions', () => {
    test('should return 200 and user permissions', async () => {
      await insertUsers([userOne]);
      const accessToken = await getAccessToken(userOne);

      const res = await request(app)
        .get('/v1/roles/permissions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        apiPermissions: expect.any(Object),
        navigationPermissions: expect.any(Object),
        branchAccess: expect.any(Array),
        allBranchesAccess: expect.any(Boolean),
      });
    });
  });

  describe('GET /v1/roles/:roleId', () => {
    test('should return 200 and the role object if data is ok', async () => {
      await insertUsers([userOne]);
      const accessToken = await getAccessToken(userOne);

      const { navigationPermissions, apiPermissions } = createTestPermissions();

      // First create a role
      const newRole = {
        name: 'Test Role',
        description: 'Test role description',
        navigationPermissions,
        apiPermissions,
      };

      const createRes = await request(app)
        .post('/v1/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newRole)
        .expect(httpStatus.CREATED);

      const roleId = createRes.body.id;

      const res = await request(app)
        .get(`/v1/roles/${roleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        id: roleId,
        name: newRole.name,
        description: newRole.description,
        navigationPermissions: newRole.navigationPermissions,
        apiPermissions: newRole.apiPermissions,
        branchAccess: [],
        allBranchesAccess: false,
        isActive: true,
        createdBy: expect.any(Object),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
    });

    test('should return 404 error if role is not found', async () => {
      await insertUsers([userOne]);
      const accessToken = await getAccessToken(userOne);

      const fakeRoleId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/v1/roles/${fakeRoleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });
}); 