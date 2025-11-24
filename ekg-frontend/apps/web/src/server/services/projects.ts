/**
 * Projects Service
 * API calls liên quan đến quản lý dự án
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  members?: string[];
  createdAt?: Date;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  status?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: string;
}

/**
 * Lấy danh sách tất cả dự án
 */
export async function getProjects(): Promise<Project[]> {
  const response = await apiGet<Project[] | { data: Project[] }>('/projects');
  return Array.isArray(response) ? response : (response.data || []);
}

/**
 * Lấy chi tiết dự án
 */
export async function getProject(id: string): Promise<Project> {
  return apiGet<Project>(`/projects/${id}`);
}

/**
 * Tạo dự án mới
 */
export async function createProject(data: CreateProjectDto): Promise<Project> {
  return apiPost<Project>('/projects', data);
}

/**
 * Cập nhật dự án
 */
export async function updateProject(
  id: string,
  data: UpdateProjectDto
): Promise<Project> {
  return apiPut<Project>(`/projects/${id}`, data);
}

/**
 * Xóa dự án
 */
export async function deleteProject(id: string): Promise<void> {
  return apiDelete(`/projects/${id}`);
}

/**
 * Lấy danh sách thành viên của dự án
 */
export async function getProjectMembers(projectId: string): Promise<string[]> {
  const response = await apiGet<{ members: string[] }>(
    `/projects/${projectId}/members`
  );
  return response.members || [];
}
