/**
 * Search Service
 * API calls liên quan đến tìm kiếm
 */

import { apiPost } from '@/lib/api-client';

export interface SearchResult {
  id: string;
  type: 'employee' | 'skill' | 'department' | 'project';
  name: string;
  score?: number;
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

/**
 * Tìm kiếm toàn bộ hệ thống
 */
export async function searchGlobal(
  queryData: SearchQuery
): Promise<SearchResult[]> {
  const response = await apiPost<{ data: SearchResult[] }>('/search', queryData);
  return response.data || [];
}

/**
 * Tìm kiếm nhân viên
 */
export async function searchEmployees(query: string): Promise<SearchResult[]> {
  return searchGlobal({
    query,
    filters: { type: 'employee' },
  });
}

/**
 * Tìm kiếm kỹ năng
 */
export async function searchSkills(query: string): Promise<SearchResult[]> {
  return searchGlobal({
    query,
    filters: { type: 'skill' },
  });
}

/**
 * Tìm kiếm phòng ban
 */
export async function searchDepartments(query: string): Promise<SearchResult[]> {
  return searchGlobal({
    query,
    filters: { type: 'department' },
  });
}

/**
 * Tìm kiếm dự án
 */
export async function searchProjects(query: string): Promise<SearchResult[]> {
  return searchGlobal({
    query,
    filters: { type: 'project' },
  });
}
