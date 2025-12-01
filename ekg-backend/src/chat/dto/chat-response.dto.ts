export interface ChatActionConfig {
  targetType: 'DuAn' | 'PhongBan' | 'CongTy';
  targetId: string;
  targetName: string;
}

export interface ChatUploadPrompt {
  type: 'upload_prompt';
  content: string;
  action: {
    type: 'show_upload';
    config: ChatActionConfig;
  };
}

export interface ChatTextResponse {
  type: 'text';
  content: string;
}

export type ChatResponse = ChatUploadPrompt | ChatTextResponse;
