// Quick test to verify timeline replacement logic
const timelineMap = new Map();
timelineMap.set('6932a39807fc564f9cbfa9fa', { _id: '6932a39807fc564f9cbfa9fa', status: 'pending', client: { name: 'Test Client' } });

const task = {
  timeline: ['6932a39807fc564f9cbfa9fa', '6932a39807fc564f9cbfaa12']
};

console.log('Before:', task.timeline);
task.timeline = task.timeline.map(tl => {
  if (typeof tl === 'string' && timelineMap.has(tl)) {
    return timelineMap.get(tl);
  }
  return tl;
});
console.log('After:', JSON.stringify(task.timeline, null, 2));

