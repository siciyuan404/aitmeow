import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import MainContent from '@/components/layout/MainContent';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ConnectionPage from '@/pages/Connection';
import PreviewPage from '@/pages/Preview';
import RepositoryPage from '@/pages/Repository';
import TemplatesPage from '@/pages/Templates';
import RulesPage from '@/pages/Rules';
import SettingsPage from '@/pages/Settings';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="flex h-screen bg-gray-950 text-gray-100">
          <Sidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <TopBar />
            <MainContent>
              <Routes>
                <Route path="/" element={<Navigate to="/connection" replace />} />
                <Route path="/connection" element={<ConnectionPage />} />
                <Route path="/preview" element={<PreviewPage />} />
                <Route path="/repository" element={<RepositoryPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </MainContent>
          </div>
        </div>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f3f4f6',
              border: '1px solid #374151',
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
