'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

export function UserMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const user = authService.getCurrentUser();

  if (!user) return null;

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          {user.hoTen[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium text-gray-800">{user.hoTen}</span>
        <span className="text-xs text-gray-500">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <p className="text-sm font-medium text-gray-900">{user.hoTen}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={() => {
                router.push('/profile');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              Hồ sơ
            </button>
            <button
              onClick={() => {
                router.push('/settings');
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              Cài đặt
            </button>
          </div>

          <div className="p-2 border-t">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
