'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">403</h1>
        <p className="text-2xl font-semibold text-red-100 mb-4">Truy cập bị từ chối</p>
        <p className="text-red-100 mb-8 max-w-md">
          Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-white text-red-600 font-semibold rounded-lg hover:bg-red-50 transition"
        >
          Quay lại Dashboard
        </Link>
      </div>
    </div>
  );
}
