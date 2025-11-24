export interface ChatMetrics {
  message: string;
  queryType: string;
  queryLevel: 'simple' | 'medium' | 'complex';
  processingTime: number;
  success: boolean;
  timestamp: Date;
  error?: string;
  fromCache?: boolean;
}

export interface QueryResponse {
  message: string;
  response: string;
  queryType: string;
  queryLevel: 'simple' | 'medium' | 'complex';
  processingTime: number;
  timestamp: string;
  fromCache?: boolean;
}
