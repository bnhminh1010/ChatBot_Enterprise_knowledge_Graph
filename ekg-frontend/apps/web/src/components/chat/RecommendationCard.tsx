'use client';

import React from 'react';

interface EmployeeRecommendation {
  rank: number;
  name: string;
  position: string;
  department: string;
  matchScore: string;
  matchingSkills: string[];
  workload: 'low' | 'medium' | 'high';
  reason: string;
}

interface RecommendationCardProps {
  type: 'recommendation' | 'training_recommendation' | 'project_recommendation';
  projectInfo?: {
    name: string;
    technologies: string[];
  };
  employee?: {
    name: string;
    currentSkills?: string[];
  };
  data: any[];
  message: string;
}

// Workload badge colors - Zen style: subtle backgrounds
const workloadColors = {
  low: 'bg-green-500/10 text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const workloadLabels = {
  low: '🟢 Rảnh',
  medium: '🟡 Vừa phải',
  high: '🔴 Bận',
};

export function RecommendationCard({
  type,
  projectInfo,
  employee,
  data,
  message,
}: RecommendationCardProps) {
  if (!data || data.length === 0) {
    return (
      <div className="my-4 p-4 bg-card rounded-xl border border-border">
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  // Employee recommendations for project
  if (type === 'recommendation') {
    return (
      <div className="my-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>
          <h3 className="text-lg font-semibold text-foreground">
            Đề xuất nhân viên cho "{projectInfo?.name}"
          </h3>
        </div>

        {projectInfo?.technologies && projectInfo.technologies.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Tech stack:</span>
            {projectInfo.technologies.map((tech, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {data.map((rec: EmployeeRecommendation) => (
            <div
              key={rec.rank}
              className="p-3 bg-background rounded-lg border border-border"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                    #{rec.rank}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{rec.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {rec.position} • {rec.department}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-400">{rec.matchScore}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-md border ${workloadColors[rec.workload]}`}>
                    {workloadLabels[rec.workload]}
                  </span>
                </div>
              </div>

              {rec.matchingSkills && rec.matchingSkills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {rec.matchingSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded-md"
                    >
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-2 text-sm text-muted-foreground italic">{rec.reason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Training recommendations
  if (type === 'training_recommendation') {
    return (
      <div className="my-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📚</span>
          <h3 className="text-lg font-semibold text-foreground">
            Đề xuất đào tạo cho {employee?.name}
          </h3>
        </div>

        <div className="space-y-2">
          {data.map((suggestion: any, i: number) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                suggestion.priority === 'high'
                  ? 'bg-red-500/5 border-red-500/20'
                  : suggestion.priority === 'medium'
                  ? 'bg-yellow-500/5 border-yellow-500/20'
                  : 'bg-muted/50 border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{suggestion.skill}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md ${
                    suggestion.priority === 'high'
                      ? 'bg-red-500/10 text-red-400'
                      : suggestion.priority === 'medium'
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {suggestion.priority === 'high' ? '🔥 Ưu tiên cao' : 
                   suggestion.priority === 'medium' ? '⚡ Nên học' : '💡 Gợi ý'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{suggestion.reason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Project recommendations for employee
  if (type === 'project_recommendation') {
    return (
      <div className="my-4 p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🚀</span>
          <h3 className="text-lg font-semibold text-foreground">
            Dự án phù hợp cho {employee?.name}
          </h3>
        </div>

        <div className="space-y-2">
          {data.map((rec: any, i: number) => (
            <div
              key={i}
              className="p-3 bg-background rounded-lg border border-border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-foreground">{rec.project.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {rec.project.client} • {rec.project.status}
                  </p>
                </div>
                <div className="text-lg font-bold text-green-400">{rec.matchScore}%</div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{rec.reason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// Helper to detect and parse recommendation data from response
export function parseRecommendationFromResponse(content: string): RecommendationCardProps | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*"type"\s*:\s*"(recommendation|training_recommendation|project_recommendation)"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (['recommendation', 'training_recommendation', 'project_recommendation'].includes(parsed.type)) {
        return parsed as RecommendationCardProps;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default RecommendationCard;
