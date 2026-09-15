import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare,
  Send,
  Sparkles,
  Plus,
  Loader2,
  FileText,
  Video,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { SourceCitation } from '../components/SourceCitation';
import { chatService } from '../services/api';
import { ChatMessage, ChatSession } from '../types';

export const AIChat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const list = await chatService.listSessions();
      setSessions(list);
      if (list.length > 0 && !activeSessionId) {
        setActiveSessionId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (sid: number) => {
    try {
      const msgs = await chatService.getMessages(sid);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewSession = async () => {
    try {
      const sess = await chatService.createSession('New Topic');
      setSessions([sess, ...sessions]);
      setActiveSessionId(sess.id);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userText = inputMessage;
    setInputMessage('');
    setSending(true);

    try {
      const resp = await chatService.sendMessage(userText, activeSessionId || undefined);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          session_id: activeSessionId || 0,
          role: 'user',
          content: userText,
          created_at: new Date().toISOString(),
        },
        resp,
      ]);
      if (!activeSessionId) {
        setActiveSessionId(resp.session_id);
        loadSessions();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar title="Multi-Source Grounded Chat" subtitle="Synthesizes resumes, job requirements, and video knowledge" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Session List */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/40 p-3 flex flex-col shrink-0">
          <button
            onClick={handleNewSession}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 mb-3 transition-colors"
          >
            <Plus className="h-4 w-4 text-teal-400" />
            <span>New Chat Session</span>
          </button>

          <div className="space-y-1 overflow-y-auto flex-1 pr-1">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-medium truncate transition-all block ${
                  activeSessionId === s.id
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Message Stream & Input */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/40">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length > 0 ? (
              messages.map((m, idx) => {
                const isUser = m.role === 'user';
                const citations = m.sources ? JSON.parse(m.sources || '[]') : [];

                return (
                  <div key={idx} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="h-8 w-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div className={`max-w-2xl space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Message Bubble */}
                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-teal-500 text-slate-950 font-medium rounded-tr-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>

                      {/* Source Citations */}
                      {!isUser && citations.length > 0 && (
                        <div className="space-y-2 mt-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Traceable Context Citations ({citations.length}):
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {citations.map((c: any, ci: number) => (
                              <SourceCitation key={ci} citation={c} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs p-6">
                <Sparkles className="h-10 w-10 text-teal-500 mb-3" />
                <p className="font-bold text-slate-200">Grounded Multi-Source AI Assistant</p>
                <p className="max-w-md mt-1 leading-relaxed">
                  Ask questions like "What should I prepare for this job?" or "Where in my uploaded videos does the speaker discuss RAG?"
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur-md">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask anything grounded across your resume, job description, and videos..."
                className="flex-1 p-3 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
