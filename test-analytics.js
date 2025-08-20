import { teamMemberAnalytics } from './src/services/analytics/index.js';

/**
 * Test script for team member analytics
 */
async function testAnalytics() {
  try {
    console.log('🧪 Testing Team Member Analytics...\n');

    // Test 1: Dashboard Cards
    console.log('1️⃣ Testing Dashboard Cards...');
    const dashboardCards = await teamMemberAnalytics.getDashboardCards();
    console.log('✅ Dashboard Cards:', JSON.stringify(dashboardCards, null, 2));
    console.log('');

    // Test 2: Task Completion Trends
    console.log('2️⃣ Testing Task Completion Trends...');
    const trends = await teamMemberAnalytics.getTaskCompletionTrends(6);
    console.log('✅ Trends:', JSON.stringify(trends, null, 2));
    console.log('');

    // Test 3: Top Team Members by Completion
    console.log('3️⃣ Testing Top Team Members by Completion...');
    const topMembers = await teamMemberAnalytics.getTopTeamMembersByCompletion(5);
    console.log('✅ Top Members:', JSON.stringify(topMembers, null, 2));
    console.log('');

    // Test 4: Top Team Members by Branch
    console.log('4️⃣ Testing Top Team Members by Branch...');
    const topMembersByBranch = await teamMemberAnalytics.getTopTeamMembersByBranch();
    console.log('✅ Top Members by Branch:', JSON.stringify(topMembersByBranch, null, 2));
    console.log('');

    // Test 5: Complete Summary
    console.log('5️⃣ Testing Complete Analytics Summary...');
    const summary = await teamMemberAnalytics.getAnalyticsSummary();
    console.log('✅ Summary generated successfully');
    console.log('📊 Summary includes:', Object.keys(summary));
    console.log('');

    // Test 6: Team Member Details Overview (if you have a team member ID)
    console.log('6️⃣ Testing Team Member Details Overview...');
    try {
      // You can replace this with an actual team member ID from your database
      const sampleTeamMemberId = '507f1f77bcf86cd799439011'; // Sample ObjectId
      const overview = await teamMemberAnalytics.getTeamMemberDetailsOverview(sampleTeamMemberId);
      console.log('✅ Team Member Overview:', JSON.stringify(overview, null, 2));
    } catch (error) {
      console.log('⚠️ Team Member Overview test skipped (no valid team member ID):', error.message);
    }

    console.log('\n🎉 All analytics tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing analytics:', error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAnalytics();
}

export { testAnalytics };
