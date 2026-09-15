import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';

import { Dashboard } from './pages/Dashboard';
import { ResumeJobs } from './pages/ResumeJobs';
import { VideoLibrary } from './pages/VideoLibrary';
import { SemanticSearch } from './pages/SemanticSearch';
import { MockInterview } from './pages/MockInterview';
import { AIChat } from './pages/AIChat';
import { Evaluation } from './pages/Evaluation';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/resume-jobs"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ResumeJobs />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/videos"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <VideoLibrary />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SemanticSearch />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/interview"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <MockInterview />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AIChat />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/evaluation"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Evaluation />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
