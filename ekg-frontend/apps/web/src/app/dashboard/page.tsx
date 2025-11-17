'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserMenu } from '@/components/auth/UserMenu';
import { authService } from '@/lib/auth';

export default function DashboardPage() {
  const user = authService.getCurrentUser();
  const isAdmin = authService.hasRole('admin');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">🧠 EKG Dashboard</h1>
            <UserMenu />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Welcome Card */}
            <div className="col-span-1 md:col-span-3 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Chào mừng, {user?.hoTen}! 👋
              </h2>
              <p className="text-gray-600">
                Bạn đang đăng nhập với role: <strong>{user?.roles.join(', ')}</strong>
              </p>
            </div>

            {/* Stats Cards */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Nhân viên</h3>
              <p className="mt-2 text-3xl font-bold text-blue-600">42</p>
              <p className="mt-2 text-sm text-gray-600">Tổng số nhân viên trong hệ thống</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Phòng ban</h3>
              <p className="mt-2 text-3xl font-bold text-green-600">8</p>
              <p className="mt-2 text-sm text-gray-600">Tổng số phòng ban</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Dự án</h3>
              <p className="mt-2 text-3xl font-bold text-purple-600">15</p>
              <p className="mt-2 text-sm text-gray-600">Dự án đang hoạt động</p>
            </div>
          </div>

          {/* Admin Only Section */}
          {isAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                🔧 Công cụ Admin
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/admin/users"
                  className="p-4 bg-white border border-blue-200 rounded hover:shadow transition"
                >
                  <h4 className="font-medium text-gray-900">Quản lý người dùng</h4>
                  <p className="text-sm text-gray-600 mt-1">Tạo, sửa, xóa tài khoản</p>
                </a>
                <a
                  href="/admin/roles"
                  className="p-4 bg-white border border-blue-200 rounded hover:shadow transition"
                >
                  <h4 className="font-medium text-gray-900">Quản lý vai trò</h4>
                  <p className="text-sm text-gray-600 mt-1">Cấu hình quyền truy cập</p>
                </a>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Nhanh chóng</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <a href="/" className="p-4 bg-blue-50 rounded hover:bg-blue-100 transition">
                <p className="font-medium text-blue-900">Tìm kiếm</p>
                <p className="text-sm text-blue-700">Tìm nhân viên, kỹ năng, dự án</p>
              </a>
              <a href="/" className="p-4 bg-green-50 rounded hover:bg-green-100 transition">
                <p className="font-medium text-green-900">Chat Bot</p>
                <p className="text-sm text-green-700">Hỏi đáp tri thức doanh nghiệp</p>
              </a>
              <a href="/" className="p-4 bg-purple-50 rounded hover:bg-purple-100 transition">
                <p className="font-medium text-purple-900">Phân tích</p>
                <p className="text-sm text-purple-700">Xem thống kê và biểu đồ</p>
              </a>
              <a href="/" className="p-4 bg-orange-50 rounded hover:bg-orange-100 transition">
                <p className="font-medium text-orange-900">Cài đặt</p>
                <p className="text-sm text-orange-700">Quản lý cấu hình hệ thống</p>
              </a>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
