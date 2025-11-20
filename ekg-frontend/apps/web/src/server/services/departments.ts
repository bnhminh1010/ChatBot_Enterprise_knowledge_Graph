/**
 * Departments Service
 * API calls liên quan đến quản lý phòng ban
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';

export interface Department {
  id: string;
  name: string;
  description?: string;
  head?: string;
  employees?: string[];
  createdAt?: Date;
}

export interface CreateDepartmentDto {
  name: string;
  description?: string;
  head?: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string;
  head?: string;
}

/**
 * Lấy danh sách tất cả phòng ban
 */
export async function getDepartments(): Promise<Department[]> {
  const response = await apiGet<Department[] | { data: Department[] }>('/departments');
  // Backend trả về array trực tiếp hoặc object với data field
  return Array.isArray(response) ? response : (response.data || []);
}

/**
 * Lấy chi tiết phòng ban
 */
export async function getDepartment(id: string): Promise<Department> {
  return apiGet<Department>(`/departments/${id}`);
}

/**
 * Tạo phòng ban mới
 */
export async function createDepartment(
  data: CreateDepartmentDto
): Promise<Department> {
  return apiPost<Department>('/departments', data);
}

/**
 * Cập nhật phòng ban
 */
export async function updateDepartment(
  id: string,
  data: UpdateDepartmentDto
): Promise<Department> {
  return apiPut<Department>(`/departments/${id}`, data);
}

/**
 * Xóa phòng ban
 */
export async function deleteDepartment(id: string): Promise<void> {
  return apiDelete(`/departments/${id}`);
}

/**
 * Lấy danh sách nhân viên của phòng ban
 */
export async function getDepartmentEmployees(
  departmentId: string
): Promise<string[]> {
  const response = await apiGet<{ employees: string[] }>(
    `/departments/${departmentId}/employees`
  );
  return response.employees || [];
}
