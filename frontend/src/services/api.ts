import axios from 'axios';
import {
  AuthResponse,
  Resume,
  JobDescription,
  Analysis,
  Video,
  VideoSearchResult,
  RAGQueryResponse,
  InterviewQuestion,
  InterviewSession,
  AnswerEvaluation,
  ChatMessage,
  ChatSession,
  EvaluationCategory,
  User,
} from '../types';

const API_BASE = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic Bearer Token Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -----------------------------------------------------------------------------
// Auth Services
// -----------------------------------------------------------------------------
export const authService = {
  login: async (email: string, password: string):Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('token', res.data.access_token);
    return res.data;
  },
  signup: async (email: string, password: string, full_name?: string, username?: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/signup', { email, password, full_name, username });
    localStorage.setItem('token', res.data.access_token);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('token');
  },
};

// -----------------------------------------------------------------------------
// Resume & Job Services
// -----------------------------------------------------------------------------
export const resumeService = {
  upload: async (file: File): Promise<Resume> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<Resume>('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  list: async (): Promise<Resume[]> => {
    const res = await api.get<Resume[]>('/resumes');
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/resumes/${id}`);
  },
};

export const jobService = {
  create: async (raw_text: string, title?: string, company?: string): Promise<JobDescription> => {
    const res = await api.post<JobDescription>('/jobs', { raw_text, title, company });
    return res.data;
  },
  list: async (): Promise<JobDescription[]> => {
    const res = await api.get<JobDescription[]>('/jobs');
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/jobs/${id}`);
  },
};

// -----------------------------------------------------------------------------
// Analysis & ATS Services
// -----------------------------------------------------------------------------
export const analysisService = {
  run: async (resume_id: number, job_description_id?: number, job_description_text?: string): Promise<Analysis> => {
    const res = await api.post<Analysis>('/analysis/run', {
      resume_id,
      job_description_id,
      job_description_text,
    });
    return res.data;
  },
  get: async (id: number): Promise<Analysis> => {
    const res = await api.get<Analysis>(`/analysis/${id}`);
    return res.data;
  },
  list: async (): Promise<Analysis[]> => {
    const res = await api.get<Analysis[]>('/analysis');
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// Video & Search Services
// -----------------------------------------------------------------------------
export const videoService = {
  upload: async (file: File, title?: string): Promise<Video> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    const res = await api.post<Video>('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  uploadYouTube: async (url: string, title?: string): Promise<Video> => {
    const formData = new FormData();
    formData.append('url', url);
    if (title) formData.append('title', title);
    const res = await api.post<Video>('/videos/youtube', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  list: async (): Promise<Video[]> => {
    const res = await api.get<Video[]>('/videos');
    return res.data;
  },
  get: async (id: number): Promise<Video> => {
    const res = await api.get<Video>(`/videos/${id}`);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/videos/${id}`);
  },
  search: async (q: string, video_id?: number): Promise<{ query: string; results: VideoSearchResult[] }> => {
    const res = await api.get('/search/videos', { params: { q, video_id } });
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// RAG & Chat Services
// -----------------------------------------------------------------------------
export const ragService = {
  query: async (question: string, sources?: string[], analysis_id?: number, session_id?: number): Promise<RAGQueryResponse> => {
    const res = await api.post<RAGQueryResponse>('/rag/query', { question, sources, analysis_id, session_id });
    return res.data;
  },
};

export const chatService = {
  createSession: async (title?: string, analysis_id?: number): Promise<ChatSession> => {
    const res = await api.post<ChatSession>('/chat/sessions', { title, analysis_id });
    return res.data;
  },
  listSessions: async (): Promise<ChatSession[]> => {
    const res = await api.get<ChatSession[]>('/chat/sessions');
    return res.data;
  },
  getMessages: async (session_id: number): Promise<ChatMessage[]> => {
    const res = await api.get<ChatMessage[]>(`/chat/sessions/${session_id}/messages`);
    return res.data;
  },
  sendMessage: async (message: string, session_id?: number, analysis_id?: number): Promise<ChatMessage> => {
    const res = await api.post<ChatMessage>('/chat/message', { message, session_id, analysis_id });
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// Mock Interview Services
// -----------------------------------------------------------------------------
export const interviewService = {
  generateQuestions: async (analysis_id: number, count = 5): Promise<InterviewQuestion[]> => {
    const res = await api.post<InterviewQuestion[]>(`/interviews/generate/${analysis_id}`, { count });
    return res.data;
  },
  createSession: async (analysis_id?: number, title?: string): Promise<InterviewSession> => {
    const res = await api.post<InterviewSession>('/interviews/sessions', { analysis_id, title });
    return res.data;
  },
  listSessions: async (): Promise<InterviewSession[]> => {
    const res = await api.get<InterviewSession[]>('/interviews/sessions');
    return res.data;
  },
  getSession: async (session_id: number): Promise<InterviewSession> => {
    const res = await api.get<InterviewSession>(`/interviews/sessions/${session_id}`);
    return res.data;
  },
  submitAnswer: async (session_id: number, question_id: number, answer_text: string): Promise<AnswerEvaluation> => {
    const res = await api.post<AnswerEvaluation>(`/interviews/sessions/${session_id}/answer`, {
      question_id,
      answer_text,
    });
    return res.data;
  },
  completeSession: async (session_id: number): Promise<InterviewSession> => {
    const res = await api.post<InterviewSession>(`/interviews/sessions/${session_id}/complete`);
    return res.data;
  },
};

// -----------------------------------------------------------------------------
// Evaluation Service
// -----------------------------------------------------------------------------
export const evaluationService = {
  getMetrics: async (): Promise<{ categories: EvaluationCategory[]; last_updated: string }> => {
    const res = await api.get('/evaluation/metrics');
    return res.data;
  },
};
