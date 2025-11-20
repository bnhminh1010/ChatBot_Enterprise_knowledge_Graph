/**
 * Employees Service
 * API calls liên quan đến quản lý nhân viên
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';

export interface Employee {
  id: string;
  name: string;
  email?: string;
  position?: string;
  department?: string;
  skills?: string[];
  createdAt?: Date;
}

export interface CreateEmployeeDto {
  name: string;
  email?: string;
  position?: string;
  department?: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  email?: string;
  position?: string;
  department?: string;
}

/**
 * Lấy danh sách tất cả nhân viên
 */
export async function getEmployees(): Promise<Employee[]> {
  const response = await apiGet<Employee[] | { data: Employee[] }>('/employees');
  return Array.isArray(response) ? response : (response.data || []);
}

/**
 * Lấy chi tiết nhân viên
 */
export async function getEmployee(id: string): Promise<Employee> {
  return apiGet<Employee>(`/employees/${id}`);
}

/**
 * Tạo nhân viên mới
 */
export async function createEmployee(data: CreateEmployeeDto): Promise<Employee> {
  return apiPost<Employee>('/employees', data);
}

/**
 * Cập nhật nhân viên
 */
export async function updateEmployee(
  id: string,
  data: UpdateEmployeeDto
): Promise<Employee> {
  return apiPut<Employee>(`/employees/${id}`, data);
}

/**
 * Xóa nhân viên
 */
export async function deleteEmployee(id: string): Promise<void> {
  return apiDelete(`/employees/${id}`);
}

/**
 * Thêm kỹ năng cho nhân viên
 */
export async function addSkillToEmployee(
  employeeId: string,
  skillId: string
): Promise<Employee> {
  return apiPost<Employee>(`/employees/${employeeId}/skills`, {
    skillId,
  });
}

/**
 * Lấy kỹ năng của nhân viên
 */
export async function getEmployeeSkills(employeeId: string): Promise<string[]> {
  const response = await apiGet<{ skills: string[] }>(
    `/employees/${employeeId}/skills`
  );
  return response.skills || [];
}
