/**
 * Connection Test Script
 * Test kết nối giữa Frontend và Backend
 * 
 * Cách chạy: 
 * 1. Đảm bảo backend đang chạy (localhost:3002)
 * 2. Mở DevTools Console trong browser (F12)
 * 3. Import và chạy: 
 *    import { testConnection } from '@/lib/connection-test'
 *    testConnection()
 */

import { apiGet, apiPost } from './api-client';
import { API_BASE_URL } from './api-config';

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

/**
 * Test kết nối cơ bản
 */
async function testBasicConnection(): Promise<void> {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const duration = performance.now() - startTime;
    
    if (response.ok) {
      results.push({
        name: 'Basic Connection',
        status: 'pass',
        message: `✅ Backend is reachable at ${API_BASE_URL}`,
        duration: Math.round(duration),
      });
    } else {
      results.push({
        name: 'Basic Connection',
        status: 'fail',
        message: `❌ Backend responded with status ${response.status}`,
        duration: Math.round(duration),
      });
    }
  } catch (error) {
    results.push({
      name: 'Basic Connection',
      status: 'fail',
      message: `❌ Cannot reach backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Test GET /employees
 */
async function testGetEmployees(): Promise<void> {
  const startTime = performance.now();
  
  try {
    const data = await apiGet<{ data?: any[] }>('/employees');
    const duration = performance.now() - startTime;
    
    if (data && typeof data === 'object') {
      const count = Array.isArray(data.data) ? data.data.length : 0;
      results.push({
        name: 'GET /employees',
        status: 'pass',
        message: `✅ Retrieved employees successfully (${count} employees)`,
        duration: Math.round(duration),
      });
    } else {
      results.push({
        name: 'GET /employees',
        status: 'fail',
        message: '❌ Unexpected response format',
        duration: Math.round(duration),
      });
    }
  } catch (error) {
    results.push({
      name: 'GET /employees',
      status: 'fail',
      message: `❌ Failed to fetch employees: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Test GET /departments
 */
async function testGetDepartments(): Promise<void> {
  const startTime = performance.now();
  
  try {
    const data = await apiGet<{ data?: any[] }>('/departments');
    const duration = performance.now() - startTime;
    
    if (data && typeof data === 'object') {
      const count = Array.isArray(data.data) ? data.data.length : 0;
      results.push({
        name: 'GET /departments',
        status: 'pass',
        message: `✅ Retrieved departments successfully (${count} departments)`,
        duration: Math.round(duration),
      });
    } else {
      results.push({
        name: 'GET /departments',
        status: 'fail',
        message: '❌ Unexpected response format',
        duration: Math.round(duration),
      });
    }
  } catch (error) {
    results.push({
      name: 'GET /departments',
      status: 'fail',
      message: `❌ Failed to fetch departments: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Test GET /skills
 */
async function testGetSkills(): Promise<void> {
  const startTime = performance.now();
  
  try {
    const data = await apiGet<{ data?: any[] }>('/skills');
    const duration = performance.now() - startTime;
    
    if (data && typeof data === 'object') {
      const count = Array.isArray(data.data) ? data.data.length : 0;
      results.push({
        name: 'GET /skills',
        status: 'pass',
        message: `✅ Retrieved skills successfully (${count} skills)`,
        duration: Math.round(duration),
      });
    } else {
      results.push({
        name: 'GET /skills',
        status: 'fail',
        message: '❌ Unexpected response format',
        duration: Math.round(duration),
      });
    }
  } catch (error) {
    results.push({
      name: 'GET /skills',
      status: 'fail',
      message: `❌ Failed to fetch skills: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Test GET /projects
 */
async function testGetProjects(): Promise<void> {
  const startTime = performance.now();
  
  try {
    const data = await apiGet<{ data?: any[] }>('/projects');
    const duration = performance.now() - startTime;
    
    if (data && typeof data === 'object') {
      const count = Array.isArray(data.data) ? data.data.length : 0;
      results.push({
        name: 'GET /projects',
        status: 'pass',
        message: `✅ Retrieved projects successfully (${count} projects)`,
        duration: Math.round(duration),
      });
    } else {
      results.push({
        name: 'GET /projects',
        status: 'fail',
        message: '❌ Unexpected response format',
        duration: Math.round(duration),
      });
    }
  } catch (error) {
    results.push({
      name: 'GET /projects',
      status: 'fail',
      message: `❌ Failed to fetch projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Test POST /search
 */
async function testSearch(): Promise<void> {
  const startTime = performance.now();
  
  try {
    const data = await apiPost<any[]>('/search', { query: 'test' });
    const duration = performance.now() - startTime;
    
    if (Array.isArray(data)) {
      results.push({
        name: 'POST /search',
        status: 'pass',
        message: `✅ Search endpoint works (${data.length} results)`,
        duration: Math.round(duration),
      });
    } else {
      results.push({
        name: 'POST /search',
        status: 'pass',
        message: '✅ Search endpoint is reachable',
        duration: Math.round(duration),
      });
    }
  } catch (error) {
    results.push({
      name: 'POST /search',
      status: 'fail',
      message: `❌ Search endpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Run all tests
 */
export async function testConnection(): Promise<void> {
  console.clear();
  console.log('🧪 Starting Frontend-Backend Connection Tests...\n');
  
  try {
    await testBasicConnection();
    await testGetEmployees();
    await testGetDepartments();
    await testGetSkills();
    await testGetProjects();
    await testSearch();
  } catch (error) {
    console.error('Test suite error:', error);
  }
  
  // Print results
  console.log('\n📊 Test Results:\n');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  
  results.forEach((result) => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`│ ${icon} ${result.name.padEnd(30)} ${result.duration ? '|' : ''}${duration.padStart(12)}`);
    console.log(`│    ${result.message}`);
  });
  
  console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  const passed = results.filter((r) => r.status === 'pass').length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ All tests passed! (${passed}/${total})\n`);
  } else {
    console.log(`⚠️  ${total - passed} test(s) failed. Check your backend connection.\n`);
  }
}

export default testConnection;
