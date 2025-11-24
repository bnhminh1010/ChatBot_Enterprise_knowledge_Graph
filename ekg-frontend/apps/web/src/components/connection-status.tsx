/**
 * Connection Status Component
 * Hiển thị trạng thái kết nối backend
 */

'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api-config';

interface StatusData {
  status: 'connected' | 'disconnected' | 'checking';
  message: string;
  responseTime?: number;
  lastCheck?: Date;
}

export function ConnectionStatus() {
  const [statusData, setStatusData] = useState<StatusData>({
    status: 'checking',
    message: 'Checking backend connection...',
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const startTime = performance.now();
        const response = await fetch(`${API_BASE_URL}/employees`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const responseTime = Math.round(performance.now() - startTime);

        if (response.ok) {
          setStatusData({
            status: 'connected',
            message: `Connected to backend at ${API_BASE_URL}`,
            responseTime,
            lastCheck: new Date(),
          });
        } else {
          setStatusData({
            status: 'disconnected',
            message: `Backend responded with status ${response.status}`,
            lastCheck: new Date(),
          });
        }
      } catch (error) {
        setStatusData({
          status: 'disconnected',
          message: `Cannot reach backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastCheck: new Date(),
        });
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    connected: 'bg-green-100 text-green-800 border-green-300',
    disconnected: 'bg-red-100 text-red-800 border-red-300',
    checking: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  const statusIcons = {
    connected: '✅',
    disconnected: '❌',
    checking: '⏳',
  };

  return (
    <div className={`border rounded-lg p-3 text-sm ${statusColors[statusData.status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{statusIcons[statusData.status]}</span>
          <span className="font-medium">{statusData.message}</span>
        </div>
        {statusData.responseTime && (
          <span className="text-xs opacity-75">{statusData.responseTime}ms</span>
        )}
      </div>
    </div>
  );
}
