import { apiClient } from './api-client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    hoTen: string;
    roles: string[];
  };
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  hoTen: string;
  roles: string[];
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const authService = {
  /**
   * Đăng nhập
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    // Lưu token vào localStorage
    if (response.access_token) {
      localStorage.setItem(TOKEN_KEY, response.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    }
    
    return response;
  },

  /**
   * Đăng xuất
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Lấy token từ localStorage
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Lấy thông tin user hiện tại
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  /**
   * Kiểm tra xem user có role không
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles.includes(role) ?? false;
  },

  /**
   * Kiểm tra xem user đã đăng nhập chưa
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  /**
   * Verify token (check xem token còn hợp lệ không)
   */
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;
      
      const response = await apiClient.get('/auth/verify');
      return response.valid;
    } catch (error) {
      this.logout();
      return false;
    }
  },

  /**
   * Lấy thông tin user hiện tại từ backend
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.user;
  },
};
