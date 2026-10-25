export interface AIChatRequest {
  message: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  error?: string;
  pending?: boolean;
}