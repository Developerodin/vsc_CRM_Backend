import mongoose from 'mongoose';
import { branchOne } from '../fixtures/branch.fixture.js';
import { insertBranches } from '../fixtures/branch.fixture.js';
import { insertUsers } from '../fixtures/user.fixture.js';
import { userOne } from '../fixtures/user.fixture.js';
import { setupTestDB } from '../testUtils.js';
import { createClientTimelines } from '../../src/services/timeline.service.js';
import Activity from '../../src/models/activity.model.js';
import Client from '../../src/models/client.model.js';
import Timeline from '../../src/models/timeline.model.js';
import { getCurrentFinancialYear } from '../../src/utils/financialYear.js';

setupTestDB();

describe('Timeline Creation Integration Tests', () => {
  let testActivity;
  let testClient;
  let testBranch;

  beforeEach(async () => {
    // Create test branch
    await insertBranches([branchOne]);
    testBranch = branchOne;

    // Create test activity with subactivities
    testActivity = await Activity.create({
      name: 'Test Activity for Timeline',
      sortOrder: 1,
      subactivities: [
        {
          name: 'Monthly GST Filing',
          frequency: 'Monthly',
          frequencyConfig: {
            monthlyDay: 20,
            monthlyTime: '09:00 AM'
          }
        },
        {
          name: 'Quarterly TDS Filing',
          frequency: 'Quarterly',
          frequencyConfig: {
            quarterlyMonths: ['April', 'July', 'October', 'January'],
            quarterlyDay: 15,
            quarterlyTime: '10:00 AM'
          }
        },
        {
          name: 'Yearly Audit',
          frequency: 'Yearly',
          frequencyConfig: {
            yearlyMonth: 'March',
            yearlyDate: 31,
            yearlyTime: '02:00 PM'
          }
        },
        {
          name: 'One-time Setup',
          frequency: 'OneTime'
        }
      ]
    });

    // Create test client
    testClient = await Client.create({
      name: 'Test Client for Timeline',
      email: 'test@example.com',
      phone: '+919876543210',
      branch: testBranch._id,
      activities: [
        {
          activity: testActivity._id,
          status: 'active'
        }
      ]
    });
  });

  afterEach(async () => {
    // Clean up
    await Timeline.deleteMany({});
    await Client.deleteMany({});
    await Activity.deleteMany({});
    await mongoose.connection.db.collection('branches').deleteMany({});
  });

  describe('Timeline Creation Flow', () => {
    it('should create timelines when client is created', async () => {
      // Check if timelines were created by the post-save middleware
      const timelines = await Timeline.find({ client: testClient._id });
      
      expect(timelines.length).toBeGreaterThan(0);
      
      // Verify timeline structure
      const firstTimeline = timelines[0];
      expect(firstTimeline.activity.toString()).toBe(testActivity._id.toString());
      expect(firstTimeline.client.toString()).toBe(testClient._id.toString());
      expect(firstTimeline.branch.toString()).toBe(testBranch._id.toString());
      expect(firstTimeline.status).toBe('pending');
      expect(firstTimeline.financialYear).toBeDefined();
      expect(firstTimeline.period).toBeDefined();
    });

    it('should create correct number of timelines based on frequency', async () => {
      const timelines = await Timeline.find({ client: testClient._id });
      
      // Should have timelines for each subactivity
      const monthlyTimelines = timelines.filter(t => 
        t.subactivity && 
        t.frequency === 'Monthly'
      );
      const quarterlyTimelines = timelines.filter(t => 
        t.subactivity && 
        t.frequency === 'Quarterly'
      );
      const yearlyTimelines = timelines.filter(t => 
        t.subactivity && 
        t.frequency === 'Yearly'
      );
      const oneTimeTimelines = timelines.filter(t => 
        t.subactivity && 
        t.frequency === 'OneTime'
      );

      // Monthly should have multiple timelines (one for each month in financial year)
      expect(monthlyTimelines.length).toBeGreaterThan(0);
      
      // Quarterly should have 4 timelines (Apr, Jul, Oct, Jan)
      expect(quarterlyTimelines.length).toBe(4);
      
      // Yearly should have 1 timeline
      expect(yearlyTimelines.length).toBe(1);
      
      // One-time should have 1 timeline
      expect(oneTimeTimelines.length).toBe(1);
    });

    it('should set correct financial year for all timelines', async () => {
      const { yearString: expectedFinancialYear } = getCurrentFinancialYear();
      const timelines = await Timeline.find({ client: testClient._id });
      
      timelines.forEach(timeline => {
        expect(timeline.financialYear).toBe(expectedFinancialYear);
      });
    });

    it('should set correct due dates for recurring timelines', async () => {
      const monthlyTimelines = await Timeline.find({ 
        client: testClient._id, 
        frequency: 'Monthly' 
      }).sort({ dueDate: 1 });
      
      if (monthlyTimelines.length > 0) {
        // First timeline should be in current financial year
        const firstTimeline = monthlyTimelines[0];
        const fy = getCurrentFinancialYear();
        
        expect(firstTimeline.dueDate.getTime()).toBeGreaterThanOrEqual(fy.start.getTime());
        expect(firstTimeline.dueDate.getTime()).toBeLessThanOrEqual(fy.end.getTime());
      }
    });
  });

  describe('Timeline Service Functions', () => {
    it('should create timelines using createClientTimelines service', async () => {
      // Clear existing timelines
      await Timeline.deleteMany({ client: testClient._id });
      
      // Use service to create timelines
      const createdTimelines = await createClientTimelines(testClient, testClient.activities);
      
      expect(createdTimelines.length).toBeGreaterThan(0);
      
      // Verify timelines were saved to database
      const savedTimelines = await Timeline.find({ client: testClient._id });
      expect(savedTimelines.length).toBe(createdTimelines.length);
    });
  });

  describe('Financial Year Calculation', () => {
    it('should calculate correct financial year dates', () => {
      const fy = getCurrentFinancialYear();
      const now = new Date();
      
      expect(fy.start.getMonth()).toBe(3); // April (0-indexed)
      expect(fy.start.getDate()).toBe(1);
      
      expect(fy.end.getMonth()).toBe(2); // March (0-indexed)
      expect(fy.end.getDate()).toBe(31);
      
      // Financial year should span current and next year
      if (now.getMonth() >= 3) { // April onwards
        expect(fy.start.getFullYear()).toBe(now.getFullYear());
        expect(fy.end.getFullYear()).toBe(now.getFullYear() + 1);
      } else { // January to March
        expect(fy.start.getFullYear()).toBe(now.getFullYear() - 1);
        expect(fy.end.getFullYear()).toBe(now.getFullYear());
      }
    });
  });
});
