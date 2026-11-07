import React, { useState } from 'react';
import { LanguageProvider } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { PageView } from './components/Navigation';
import { LoginPage } from './pages/LoginPage';
import { SeniorHomePage } from './pages/SeniorHomePage';
import { HelpRequestPage } from './pages/HelpRequestPage';
import { FamilyConnectPage } from './pages/FamilyConnectPage';
import { SOSPage } from './pages/SOSPage';
import { HelperDashboard } from './pages/HelperDashboard';
import { FamilyDashboard } from './pages/FamilyDashboard';
import { AssistantPage } from './pages/AssistantPage';
import { RemindersPage } from './pages/RemindersPage';
import { ExplainerPage } from './pages/ExplainerPage';
import { ContactsPage } from './pages/ContactsPage';
import { SettingsPage } from './pages/SettingsPage';

const SeniorApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [helpSeed, setHelpSeed] = useState('');
  const [isAddReminderModalOpen, setIsAddReminderModalOpen] = useState(false);

  const go = (page: PageView) => {
    if (page !== 'help') setHelpSeed('');
    setCurrentPage(page);
  };

  return (
    <Layout currentPage={currentPage} onNavigate={go}>
      {currentPage === 'home' && <SeniorHomePage onNavigate={go} />}
      {currentPage === 'assistant' && (
        <AssistantPage
          onRequestHelp={(text) => {
            setHelpSeed(text);
            setCurrentPage('help');
          }}
        />
      )}
      {currentPage === 'help' && <HelpRequestPage key={helpSeed} initialText={helpSeed} onHome={() => go('home')} />}
      {currentPage === 'reminders' && (
        <RemindersPage isAddModalOpen={isAddReminderModalOpen} onCloseAddModal={() => setIsAddReminderModalOpen(false)} />
      )}
      {currentPage === 'family' && <FamilyConnectPage />}
      {currentPage === 'sos' && <SOSPage onHome={() => go('home')} />}
      {currentPage === 'explainer' && <ExplainerPage />}
      {currentPage === 'contacts' && <ContactsPage />}
      {currentPage === 'settings' && <SettingsPage />}
    </Layout>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  // key = user id so switching accounts in the same tab never leaks the previous user's screen state
  if (user.role === 'helper') return <HelperDashboard key={user.user_id} />;
  if (user.role === 'family') return <FamilyDashboard key={user.user_id} />;
  return <SeniorApp key={user.user_id} />;
};

export const App: React.FC = () => (
  <LanguageProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </LanguageProvider>
);

export default App;
