#!/usr/bin/env node

/**
 * Test script to verify validation changes
 */

import Joi from 'joi';
import { objectId } from '../src/validations/custom.validation.js';

// Test the validation schemas
const getTimelineStatusByFrequency = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(''),
    endDate: Joi.date().iso().optional().allow(''),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional().allow(''),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing').optional().allow(''),
  }),
};

// Test cases
const testCases = [
  {
    name: 'Only branchId (no dates)',
    query: { branchId: '685140f7a5039eb69705aed6' },
    shouldPass: true
  },
  {
    name: 'branchId with dates',
    query: { 
      branchId: '685140f7a5039eb69705aed6',
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    },
    shouldPass: true
  },
  {
    name: 'Only dates (no branchId)',
    query: { 
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    },
    shouldPass: true
  },
  {
    name: 'Empty query',
    query: {},
    shouldPass: true
  },
  {
    name: 'Invalid date format',
    query: { 
      branchId: '685140f7a5039eb69705aed6',
      startDate: 'invalid-date',
      endDate: '2024-01-31'
    },
    shouldPass: false
  }
];

console.log('🧪 Testing Dashboard API Validation...\n');

testCases.forEach((testCase, index) => {
  console.log(`📋 Test ${index + 1}: ${testCase.name}`);
  console.log(`📝 Query:`, testCase.query);
  
  try {
    const { error } = getTimelineStatusByFrequency.query.validate(testCase.query);
    
    if (error) {
      console.log(`❌ Validation Error: ${error.message}`);
      if (testCase.shouldPass) {
        console.log(`❌ FAILED - Expected to pass but failed`);
      } else {
        console.log(`✅ PASSED - Expected to fail and did fail`);
      }
    } else {
      console.log(`✅ Validation passed`);
      if (testCase.shouldPass) {
        console.log(`✅ PASSED - Expected to pass and did pass`);
      } else {
        console.log(`❌ FAILED - Expected to fail but passed`);
      }
    }
  } catch (err) {
    console.log(`❌ Unexpected error: ${err.message}`);
  }
  
  console.log('─'.repeat(60));
});

console.log('\n🎉 Validation tests completed!'); 