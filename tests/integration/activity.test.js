import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../src/app';
import setupTestDB from '../utils/setupTestDB';

setupTestDB();

describe('Activity routes', () => {
  describe('POST /v1/activities', () => {
    test('should create a new activity', async () => {
      const activityData = {
        name: 'Test Activity',
        sortOrder: 1
      };

      const res = await request(app)
        .post('/v1/activities')
        .send(activityData)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual({
        id: expect.anything(),
        name: activityData.name,
        sortOrder: activityData.sortOrder,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
    });

    test('should create activity with subactivities', async () => {
      const activityData = {
        name: 'Test Activity with Subactivities',
        sortOrder: 1,
        subactivities: [
          {
            name: 'Subactivity 1',
            frequency: 'Daily',
            frequencyConfig: {
              dailyTime: '09:00 AM'
            }
          },
          {
            name: 'Subactivity 2',
            frequency: 'None'
          }
        ]
      };

      const res = await request(app)
        .post('/v1/activities')
        .send(activityData)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual({
        id: expect.anything(),
        name: activityData.name,
        sortOrder: activityData.sortOrder,
        subactivities: expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            name: 'Subactivity 1',
            frequency: 'Daily',
            frequencyConfig: {
              dailyTime: '09:00 AM'
            }
          }),
          expect.objectContaining({
            id: expect.anything(),
            name: 'Subactivity 2',
            frequency: 'None'
          })
        ]),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
    });
  });

  describe('GET /v1/activities', () => {
    test('should get activities with pagination', async () => {
      const res = await request(app)
        .get('/v1/activities')
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: expect.any(Number),
        totalResults: expect.any(Number),
      });
    });

    test('should filter activities by name', async () => {
      const res = await request(app)
        .get('/v1/activities?name=Test')
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toBeDefined();
    });
  });

  describe('GET /v1/activities/:activityId', () => {
    test('should get activity by id', async () => {
      // First create an activity
      const activityData = {
        name: 'Test Activity for Get',
        sortOrder: 2
      };

      const createRes = await request(app)
        .post('/v1/activities')
        .send(activityData)
        .expect(httpStatus.CREATED);

      const activityId = createRes.body.id;

      // Then get it by id
      const res = await request(app)
        .get(`/v1/activities/${activityId}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.id).toBe(activityId);
      expect(res.body.name).toBe(activityData.name);
    });

    test('should return 404 if activity not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/v1/activities/${fakeId}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /v1/activities/:activityId', () => {
    test('should update activity', async () => {
      // First create an activity
      const activityData = {
        name: 'Test Activity for Update',
        sortOrder: 3
      };

      const createRes = await request(app)
        .post('/v1/activities')
        .send(activityData)
        .expect(httpStatus.CREATED);

      const activityId = createRes.body.id;

      // Then update it
      const updateData = {
        name: 'Updated Activity Name',
        frequency: 'Weekly',
        frequencyConfig: {
          weeklyDays: ['Monday', 'Wednesday'],
          weeklyTime: '10:30 AM'
        }
      };

      const res = await request(app)
        .patch(`/v1/activities/${activityId}`)
        .send(updateData)
        .expect(httpStatus.OK);

      expect(res.body.name).toBe(updateData.name);
      expect(res.body.frequency).toBe(updateData.frequency);
      expect(res.body.frequencyConfig).toEqual(updateData.frequencyConfig);
    });
  });

  describe('DELETE /v1/activities/:activityId', () => {
    test('should delete activity', async () => {
      // First create an activity
      const activityData = {
        name: 'Test Activity for Delete',
        sortOrder: 4
      };

      const createRes = await request(app)
        .post('/v1/activities')
        .send(activityData)
        .expect(httpStatus.CREATED);

      const activityId = createRes.body.id;

      // Then delete it
      await request(app)
        .delete(`/v1/activities/${activityId}`)
        .send()
        .expect(httpStatus.NO_CONTENT);

      // Verify it's deleted
      await request(app)
        .get(`/v1/activities/${activityId}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('POST /v1/activities/bulk-import', () => {
    test('should bulk import activities', async () => {
      const activitiesData = {
        activities: [
          {
            name: 'Bulk Activity 1',
            sortOrder: 5,
            frequency: 'Monthly',
            frequencyConfig: {
              monthlyDay: 15,
              monthlyTime: '02:00 PM'
            }
          },
          {
            name: 'Bulk Activity 2',
            sortOrder: 6,
            frequency: 'Yearly',
            frequencyConfig: {
              yearlyMonth: 'December',
              yearlyDate: 25,
              yearlyTime: '12:00 PM'
            }
          }
        ]
      };

      const res = await request(app)
        .post('/v1/activities/bulk-import')
        .send(activitiesData)
        .expect(httpStatus.OK);

      expect(res.body.created).toBe(2);
      expect(res.body.updated).toBe(0);
      expect(res.body.errors).toEqual([]);
    });
  });
});
