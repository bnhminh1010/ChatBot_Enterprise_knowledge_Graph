/**
 * API Configuration
 * Centralized API endpoints configuration
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export const API_ENDPOINTS = {
  // Employees
  employees: {
    list: '/employees',
    get: (id: string) => `/employees/${id}`,
    create: '/employees',
    update: (id: string) => `/employees/${id}`,
    delete: (id: string) => `/employees/${id}`,
    skills: (id: string) => `/employees/${id}/skills`,
    addSkill: (id: string) => `/employees/${id}/skills`,
  },

  // Departments
  departments: {
    list: '/departments',
    get: (id: string) => `/departments/${id}`,
    create: '/departments',
    update: (id: string) => `/departments/${id}`,
    delete: (id: string) => `/departments/${id}`,
    employees: (id: string) => `/departments/${id}/employees`,
  },

  // Skills
  skills: {
    list: '/skills',
    get: (id: string) => `/skills/${id}`,
    create: '/skills',
    delete: (id: string) => `/skills/${id}`,
    employees: (id: string) => `/skills/${id}/employees`,
  },

  // Projects
  projects: {
    list: '/projects',
    get: (id: string) => `/projects/${id}`,
    create: '/projects',
    update: (id: string) => `/projects/${id}`,
    delete: (id: string) => `/projects/${id}`,
    members: (id: string) => `/projects/${id}/members`,
  },

  // Search
  search: {
    global: '/search',
  },

  // Docs
  docs: '/docs',
} as const;

/**
 * Get full API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
