'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = authService.isAuthenticated();
      
      if (!isAuth) {
        router.push('/login');
        return;
      }

      // Nếu có required roles, kiểm tra user có role không
      if (requiredRoles && requiredRoles.length > 0) {
        const user = authService.getCurrentUser();
        const hasRequiredRole = requiredRoles.some(role => user?.roles.includes(role));
        
        if (!hasRequiredRole) {
          router.push('/unauthorized');
          return;
        }
      }

      setIsAuthorized(true);
      setLoading(false);
    };

    checkAuth();
  }, [router, requiredRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
