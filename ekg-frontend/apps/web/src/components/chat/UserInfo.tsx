import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function UserInfo() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null; // Shouldn't happen since page.tsx checks auth
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get role badge color
  const getRoleBadge = (role: string) => {
    return role === 'ADMIN'
      ? { text: 'Admin', color: 'bg-gradient-to-br from-purple-500 to-pink-600' }
      : { text: 'Viewer', color: 'bg-gradient-to-br from-blue-500 to-cyan-600' };
  };

  const badge = getRoleBadge(user.role);
  
  // Calculate initials safely
  let initials = 'U';
  if (user.hoTen) {
    const names = user.hoTen.split(' ').filter(n => n.length > 0);
    if (names.length > 0) {
      initials = names.map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
  } else if (user.username) {
    initials = user.username.slice(0, 2).toUpperCase();
  }

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border">
        <div
          className={`w-8 h-8 rounded-full ${badge.color} flex items-center justify-center text-white text-xs font-bold shadow`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {user.hoTen || user.username}
          </p>
          <p className="text-xs text-muted-foreground truncate">{badge.text}</p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogOut className="w-4 h-4" />
        <span>{isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
      </button>
    </>
  );
}
