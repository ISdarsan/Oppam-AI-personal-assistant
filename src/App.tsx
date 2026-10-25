import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { Layout } from './components/Layout';
import { PageView } from './components/Navigation';
import { WelcomePage } from './pages/WelcomePage';
import { DashboardPage } from './pages/DashboardPage';
import { AssistantPage } from './pages/AssistantPage';
import { RemindersPage } from './pages/RemindersPage';
import { ExplainerPage } from './pages/ExplainerPage';
import { ContactsPage } from './pages/ContactsPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { settings, updateSettings } = useLanguage();
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [isAddReminderModalOpen, setIsAddReminderModalOpen] = useState(false);

  // If user hasn't completed onboarding, show welcome setup
  if (!settings.completedOnboarding) {
    return (
      <WelcomePage
        onComplete={() => {
          updateSettings({ completedOnboarding: true });
          setCurrentPage('home');
        }}
      />
    );
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'home' && (
        <DashboardPage
          onNavigate={setCurrentPage}
          onOpenAddReminder={() => {
            setCurrentPage('reminders');
            setIsAddReminderModalOpen(true);
          }}
        />
      )}

      {currentPage === 'assistant' && (
        <AssistantPage
          onReminderSaved={() => {
            // Optional callback
          }}
        />
      )}

      {currentPage === 'reminders' && (
        <RemindersPage
          isAddModalOpen={isAddReminderModalOpen}
          onCloseAddModal={() => setIsAddReminderModalOpen(false)}
        />
      )}

      {currentPage === 'explainer' && <ExplainerPage />}

      {currentPage === 'contacts' && <ContactsPage />}

      {currentPage === 'settings' && <SettingsPage />}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
