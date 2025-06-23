import request from 'supertest';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import setupTestDB from '../utils/setupTestDB.js';
import { User } from '../../src/models/index.js';
import { userOne, insertUsers } from '../fixtures/user.fixture.js';
import { getAccessToken } from '../fixtures/token.fixture.js';

setupTestDB();

describe('Role routes', () => {
  describe('POST /v1/roles', () => {
    test('should return 201 and successfully create role if data is ok', async () => {
      await insertUsers([userOne]);
      const accessToken = await getAccessToken(userOne);

      const newRole = {
        name: 'Test Role',
        description: 'Test role description',
        navigationPermissions: {
          dashboard: true,
          clients: true,
          groups: false,
          teams: false,
          timelines: false,
          analytics: false,
          settings: {
            activities: false,
            branches: false,
            users: false,
            roles: false,
          },
        },
        apiPermissions: {
          getUsers: false,
          manageUsers: false,
          getTeamMembers: true,
          manageTeamMembers: false,
          getActivities: true,
          manageActivities: false,
          getBranches: true,
          manageBranches: false,
          getClients: true,
          manageClients: false,
          getGroups: true,
          manageGroups: false,
          getRoles: false,
          manageRoles: false,
        },
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

      const newRole = {
        name: 'Test Role',
        description: 'Test role description',
        navigationPermissions: {
          dashboard: true,
        },
        apiPermissions: {
          getUsers: false,
        },
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

      // First create a role
      const newRole = {
        name: 'Test Role',
        description: 'Test role description',
        navigationPermissions: {
          dashboard: true,
        },
        apiPermissions: {
          getUsers: false,
        },
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