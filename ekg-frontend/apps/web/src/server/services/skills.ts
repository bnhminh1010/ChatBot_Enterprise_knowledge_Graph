/**
 * Skills Service
 * API calls liên quan đến quản lý kỹ năng
 */

import { apiGet, apiPost, apiDelete } from '@/lib/api-client';

export interface Skill {
  id: string;
  name: string;
  category?: string;
  description?: string;
  employees?: string[];
  createdAt?: Date;
}

export interface CreateSkillDto {
  name: string;
  category?: string;
  description?: string;
}

/**
 * Lấy danh sách tất cả kỹ năng
 */
export async function getSkills(): Promise<Skill[]> {
  const response = await apiGet<Skill[] | { data: Skill[] }>('/skills');
  return Array.isArray(response) ? response : (response.data || []);
}

/**
 * Lấy chi tiết kỹ năng
 */
export async function getSkill(id: string): Promise<Skill> {
  return apiGet<Skill>(`/skills/${id}`);
}

/**
 * Tạo kỹ năng mới
 */
export async function createSkill(data: CreateSkillDto): Promise<Skill> {
  return apiPost<Skill>('/skills', data);
}

/**
 * Xóa kỹ năng
 */
export async function deleteSkill(id: string): Promise<void> {
  return apiDelete(`/skills/${id}`);
}

/**
 * Lấy danh sách nhân viên có kỹ năng này
 */
export async function getSkillEmployees(skillId: string): Promise<string[]> {
  const response = await apiGet<{ employees: string[] }>(
    `/skills/${skillId}/employees`
  );
  return response.employees || [];
}
