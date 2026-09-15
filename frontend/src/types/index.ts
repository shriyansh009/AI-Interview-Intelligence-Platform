export interface User {
  id: number;
  email: string;
  username?: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Resume {
  id: number;
  filename: string;
  file_path: string;
  raw_text: string;
  parsed_skills: string; // JSON
  parsed_experience: string;
  parsed_education: string;
  created_at: string;
}

export interface JobDescription {
  id: number;
  title: string;
  company?: string;
  raw_text: string;
  required_skills: string; // JSON
  preferred_skills: string;
  responsibilities: string;
  created_at: string;
}

export interface Analysis {
  id: number;
  resume_id: number;
  job_description_id?: number;
  job_description_text: string;
  ats_score: number;
  matching_skills: string; // JSON
  missing_skills: string; // JSON
  partial_skills?: string;
  suggestions: string; // JSON
  created_at: string;
}

export interface TranscriptChunk {
  id: number;
  chunk_index: number;
  text: string;
  start_time: number;
  end_time: number;
  language: string;
}

export interface Video {
  id: number;
  title: string;
  source_type: 'upload' | 'youtube';
  source_url?: string;
  file_path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  duration_seconds: number;
  created_at: string;
  summary?: string;
  action_items?: string;
  key_decisions?: string;
  open_questions?: string;
  chunks?: TranscriptChunk[];
}

export interface VideoSearchResult {
  video_id: number;
  video_title: string;
  chunk_id: number;
  text: string;
  start_time: number;
  end_time: number;
  timestamp_formatted: string;
  similarity_score: number;
}

export interface SourceCitation {
  source_type: 'video' | 'resume' | 'job_description' | 'history';
  source_id?: number;
  title?: string;
  section?: string;
  start_time?: number;
  end_time?: number;
  timestamp_formatted?: string;
  text_snippet: string;
  similarity: number;
}

export interface RAGQueryResponse {
  question: string;
  answer: string;
  sources: SourceCitation[];
  response_time_ms: number;
}

export interface InterviewQuestion {
  id: number;
  session_id?: number;
  analysis_id?: number;
  question_type: string;
  question_text: string;
  model_answer?: string;
  category: string;
  order_index: number;
}

export interface AnswerEvaluation {
  answer_id: number;
  question_id: number;
  technical_accuracy: number;
  relevance: number;
  completeness: number;
  clarity: number;
  confidence: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_concepts: string[];
  suggested_answer?: string;
}

export interface InterviewSession {
  id: number;
  analysis_id?: number;
  title: string;
  status: 'in_progress' | 'completed';
  overall_score?: number;
  summary_feedback?: string;
  started_at: string;
  completed_at?: string;
  questions?: InterviewQuestion[];
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: string;
  model_name?: string;
  response_time_ms?: number;
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  analysis_id?: number;
  created_at: string;
  updated_at: string;
}

export interface MetricItem {
  name: string;
  value: number;
  formatted_value: string;
  description?: string;
}

export interface EvaluationCategory {
  category: string;
  metrics: MetricItem[];
}
