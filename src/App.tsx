import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { VideoModal } from './components/VideoModal';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { PenDriveRecoveryPage } from './pages/PenDriveRecoveryPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { PortfolioDetailPage } from './pages/PortfolioDetailPage';
import { LabPage } from './pages/LabPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';
import { Toaster } from './components/ui';

export const App: React.FC = () => {
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const handleOpenVideo = (url: string, title: string) => {
    setVideoModal({
      isOpen: true,
      url,
      title
    });
  };

  const handleCloseVideo = () => {
    setVideoModal({
      isOpen: false,
      url: '',
      title: ''
    });
  };

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Navbar />

        <main id="main-content" style={{ flex: 1 }}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  onOpenVideo={handleOpenVideo}
                />
              }
            />
            <Route
              path="/services"
              element={<ServicesPage />}
            />
            <Route
              path="/services/pen-drive-data-recovery"
              element={<PenDriveRecoveryPage />}
            />
            <Route
              path="/services/:slug"
              element={<ServiceDetailPage />}
            />
            <Route
              path="/portfolio"
              element={<PortfolioPage onOpenVideo={handleOpenVideo} />}
            />
            <Route
              path="/portfolio/:slug"
              element={<PortfolioDetailPage onOpenVideo={handleOpenVideo} />}
            />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/lab/courses/:slug" element={<CourseDetailPage />} />
            <Route path="/lab/:slug" element={<CourseDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route
              path="*"
              element={
                <HomePage
                  onOpenVideo={handleOpenVideo}
                />
              }
            />
          </Routes>
        </main>

        <Footer />

        <VideoModal
          isOpen={videoModal.isOpen}
          onClose={handleCloseVideo}
          videoUrl={videoModal.url}
          title={videoModal.title}
        />

        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
};

export default App;
