'use client';

import React from 'react';

interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'done';
  assignee?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

interface MeetingSuggestion {
  suggestedTime: string;
  participants: { id: string; name: string; available: boolean }[];
  conflictCount: number;
  reason: string;
}

interface TeamAvailability {
  employee: {
    id: string;
    name: string;
    position: string;
  };
  pendingTasks: number;
  activeTasks: number;
  workloadLevel: 'low' | 'medium' | 'high';
  availability: 'available' | 'busy' | 'overloaded';
}

interface TaskCardProps {
  type: 'task_created' | 'task_assigned' | 'meeting_suggestion' | 'team_availability';
  data: any;
  summary?: any;
  message: string;
}

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const priorityLabels = {
  low: '📋 Thấp',
  medium: '⚡ Trung bình',
  high: '🔥 Cao',
};

const statusColors = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-400',
  done: 'bg-green-500/10 text-green-400',
};

const statusLabels = {
  pending: '⏳ Chờ xử lý',
  in_progress: '🔄 Đang thực hiện',
  done: '✅ Hoàn thành',
};

const availabilityColors = {
  available: 'bg-green-500/10 text-green-400',
  busy: 'bg-yellow-500/10 text-yellow-400',
  overloaded: 'bg-red-500/10 text-red-400',
};

const availabilityLabels = {
  available: '🟢 Rảnh',
  busy: '🟡 Bận vừa',
  overloaded: '🔴 Quá tải',
};

export function TaskCard({ type, data, summary, message }: TaskCardProps) {
  // Task created
  if (type === 'task_created') {
    const task = data as Task;
    return (
      <div className="my-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">✅</span>
          <h3 className="text-lg font-semibold text-foreground">Task đã tạo</h3>
        </div>

        <div className="p-3 bg-background rounded-lg border border-border">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-foreground">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded-md border ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded-md ${statusColors[task.status]}`}>
              {statusLabels[task.status]}
            </span>
            {task.assignee && (
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400">
                👤 {task.assignee.name}
              </span>
            )}
            {task.project && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400">
                📁 {task.project.name}
              </span>
            )}
            {task.deadline && (
              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400">
                📅 {new Date(task.deadline).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">ID: {task.id}</p>
        </div>
      </div>
    );
  }

  // Task assigned
  if (type === 'task_assigned') {
    return (
      <div className="my-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">👤</span>
          <h3 className="text-lg font-semibold text-foreground">Task đã giao</h3>
        </div>

        <div className="p-3 bg-background rounded-lg border border-border">
          <p className="text-foreground">
            <span className="text-primary font-medium">{data.task?.title}</span>
            {' → '}
            <span className="text-green-400 font-medium">{data.employee?.name}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Status: <span className="text-blue-400">in_progress</span>
          </p>
        </div>
      </div>
    );
  }

  // Meeting suggestions
  if (type === 'meeting_suggestion') {
    const suggestions = data as MeetingSuggestion[];
    return (
      <div className="my-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📅</span>
          <h3 className="text-lg font-semibold text-foreground">Đề xuất thời gian họp</h3>
        </div>

        <div className="space-y-3">
          {suggestions.map((suggestion, i) => {
            const date = new Date(suggestion.suggestedTime);
            return (
              <div
                key={i}
                className="p-3 bg-background rounded-lg border border-border"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-sm text-primary">
                      {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {suggestion.conflictCount === 0 ? (
                    <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-md">
                      ✓ Không xung đột
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-md">
                      ⚠️ {suggestion.conflictCount} xung đột
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{suggestion.reason}</p>
                
                <div className="mt-2 flex flex-wrap gap-1">
                  {suggestion.participants.map((p, idx) => (
                    <span
                      key={idx}
                      className={`text-xs px-2 py-0.5 rounded-md ${
                        p.available ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {p.available ? '✓' : '✗'} {p.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Team availability
  if (type === 'team_availability') {
    const availability = data as TeamAvailability[];
    return (
      <div className="my-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📊</span>
          <h3 className="text-lg font-semibold text-foreground">Workload của Team</h3>
        </div>

        {summary && (
          <div className="mb-4 flex gap-4 text-sm">
            <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg">
              🟢 Rảnh: {summary.available}
            </span>
            <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg">
              🟡 Bận: {summary.busy}
            </span>
            <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg">
              🔴 Quá tải: {summary.overloaded}
            </span>
          </div>
        )}

        <div className="space-y-2">
          {availability.slice(0, 10).map((item, i) => (
            <div
              key={i}
              className="p-3 bg-background rounded-lg border border-border flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{item.employee.name}</p>
                <p className="text-xs text-muted-foreground">{item.employee.position}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {item.pendingTasks + item.activeTasks} tasks
                </span>
                <span className={`text-xs px-2 py-1 rounded-md ${availabilityColors[item.availability]}`}>
                  {availabilityLabels[item.availability]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {availability.length > 10 && (
          <p className="mt-2 text-sm text-muted-foreground text-center">
            ... và {availability.length - 10} người khác
          </p>
        )}
      </div>
    );
  }

  return null;
}

// Helper to detect and parse task/scheduler data from response
export function parseTaskFromResponse(content: string): TaskCardProps | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*"type"\s*:\s*"(task_created|task_assigned|meeting_suggestion|team_availability)"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (['task_created', 'task_assigned', 'meeting_suggestion', 'team_availability'].includes(parsed.type)) {
        return parsed as TaskCardProps;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default TaskCard;
