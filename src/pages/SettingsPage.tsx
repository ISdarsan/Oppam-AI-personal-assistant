import React, { useState, useEffect } from 'react';
import {
  Globe,
  Type,
  Volume2,
  Cpu,
  Download,
  Trash2,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { supportedLanguages } from '../i18n/translations';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { HealthStatus, TextSize } from '../types';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, textSize, setTextSize, settings, updateSettings, t } =
    useLanguage();

  const [displayName, setDisplayName] = useState(settings.displayName);
  const [autoSpeak, setAutoSpeak] = useState(settings.autoSpeak);
  const [speechRate, setSpeechRate] = useState(settings.speechRate);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleSaveProfile = () => {
    updateSettings({
      displayName: displayName.trim(),
      autoSpeak,
      speechRate,
    });
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3000);
  };

  const handleExportData = () => {
    const jsonStr = storage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sahaaya_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    storage.clearAllData();
    setIsResetModalOpen(false);
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-black text-sahaaya-text tracking-tight">
          {t('settingsTitle')}
        </h2>
        <p className="text-lg text-sahaaya-muted mt-1">{t('settingsSubtitle')}</p>
      </div>

      {/* 1. Language & Display Name Card */}
      <Card className="flex flex-col gap-6 bg-white p-6 sm:p-8">
        {/* Language selector */}
        <div className="flex flex-col gap-3">
          <label className="text-xl font-bold text-sahaaya-text flex items-center gap-2">
            <Globe className="w-5 h-5 text-sahaaya-primary" />
            <span>{t('settingsLanguage')}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`py-3 px-3 rounded-2xl font-bold border-2 transition-all min-h-[52px] text-center flex flex-col items-center justify-center ${
                  language === lang.code
                    ? 'bg-sahaaya-primary text-white border-sahaaya-primary shadow-sm'
                    : 'bg-white text-sahaaya-text border-sahaaya-border hover:border-sahaaya-primary'
                }`}
              >
                <span className="text-base sm:text-lg">{lang.nativeName}</span>
                <span className={`text-xs ${language === lang.code ? 'text-emerald-100' : 'text-sahaaya-muted'}`}>
                  {lang.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Display name */}
        <div className="flex flex-col gap-2 pt-4 border-t border-sahaaya-border max-w-md">
          <Input
            label={t('settingsDisplayName')}
            placeholder={t('settingsDisplayNamePlaceholder')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Text size selector */}
        <div className="flex flex-col gap-3 pt-4 border-t border-sahaaya-border">
          <label className="text-xl font-bold text-sahaaya-text flex items-center gap-2">
            <Type className="w-5 h-5 text-sahaaya-primary" />
            <span>{t('settingsTextSize')}</span>
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {(['normal', 'large', 'xlarge'] as TextSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setTextSize(size)}
                className={`py-3 px-3 rounded-2xl font-bold border-2 transition-all min-h-[52px] capitalize ${
                  textSize === size
                    ? 'bg-sahaaya-primary text-white border-sahaaya-primary shadow-sm'
                    : 'bg-white text-sahaaya-text border-sahaaya-border hover:border-sahaaya-primary'
                } ${
                  size === 'normal'
                    ? 'text-base'
                    : size === 'large'
                    ? 'text-lg'
                    : 'text-xl'
                }`}
              >
                {t(
                  size === 'normal'
                    ? 'settingsTextSizeNormal'
                    : size === 'large'
                    ? 'settingsTextSizeLarge'
                    : 'settingsTextSizeXLarge'
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Speech options */}
        <div className="flex flex-col gap-4 pt-4 border-t border-sahaaya-border">
          <h3 className="text-xl font-bold text-sahaaya-text flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-sahaaya-primary" />
            <span>{t('settingsSpeech')}</span>
          </h3>

          <label className="flex items-center gap-3 cursor-pointer min-h-[48px]">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="w-6 h-6 rounded-lg text-sahaaya-primary focus:ring-sahaaya-primary border-sahaaya-border cursor-pointer"
            />
            <span className="text-lg font-medium text-sahaaya-text">
              {t('settingsAutoSpeak')}
            </span>
          </label>

          <div className="flex flex-col gap-2 max-w-md">
            <label className="text-base font-semibold text-sahaaya-text">
              {t('settingsSpeechRate')}: {speechRate <= 0.85 ? t('settingsSpeechSlow') : t('settingsSpeechNormal')}
            </label>
            <input
              type="range"
              min="0.7"
              max="1.2"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full accent-sahaaya-primary cursor-pointer min-h-[44px]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-sahaaya-border flex items-center gap-4">
          <Button onClick={handleSaveProfile} size="lg">
            {t('btnSave')}
          </Button>
          {saveFeedback && (
            <span className="text-emerald-700 font-bold text-base flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle className="w-5 h-5" />
              <span>{t('btnSave')} ✓</span>
            </span>
          )}
        </div>
      </Card>

      {/* 2. Open-Weight AI Health & Status Card */}
      <Card className="flex flex-col gap-5 bg-white p-6 sm:p-8 border-2 border-sahaaya-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sahaaya-cream text-sahaaya-primary flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-sahaaya-text">
                {t('settingsAIStatus')}
              </h3>
              <p className="text-sm text-sahaaya-muted">
                Ollama local inference engine
              </p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            disabled={isCheckingHealth}
            className="p-3 rounded-xl border border-sahaaya-border hover:bg-sahaaya-cream text-sahaaya-primary min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Refresh AI health status"
            title="Refresh status"
          >
            <RefreshCw className={`w-5 h-5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-sahaaya-bg rounded-2xl p-5 border border-sahaaya-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-sahaaya-text">
              {t('settingsModelInfo')}
            </span>
            <code className="text-base font-bold bg-white px-3 py-1 rounded-xl border border-sahaaya-border text-sahaaya-primary">
              {health?.configured_model || 'gemma2:2b'}
            </code>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-sahaaya-text">Status:</span>
            {health?.status === 'healthy' ? (
              <Badge variant="success" icon={<CheckCircle className="w-4 h-4" />}>
                {t('settingsConnected')}
              </Badge>
            ) : health?.status === 'degraded' ? (
              <Badge variant="warning" icon={<AlertTriangle className="w-4 h-4" />}>
                Model not pulled
              </Badge>
            ) : (
              <Badge variant="danger" icon={<AlertTriangle className="w-4 h-4" />}>
                {t('settingsDisconnected')}
              </Badge>
            )}
          </div>

          <p className="text-base text-sahaaya-muted mt-1 leading-relaxed">
            {health?.message || 'Checking local AI endpoint at http://localhost:11434...'}
          </p>

          {health?.status !== 'healthy' && (
            <div className="bg-white rounded-xl p-4 border border-sahaaya-border text-sm text-sahaaya-text font-mono">
              <p className="font-bold mb-1 font-sans text-sahaaya-primary">To start local AI:</p>
              <code>1. ollama serve</code><br />
              <code>2. ollama run gemma2:2b</code>
            </div>
          )}
        </div>
      </Card>

      {/* 3. Data & Privacy Card */}
      <Card className="flex flex-col gap-5 bg-white p-6 sm:p-8 border-2 border-sahaaya-border">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-sahaaya-text">
              {t('settingsDataPrivacy')}
            </h3>
            <p className="text-base text-sahaaya-muted mt-1 leading-relaxed">
              {t('settingsDataPrivacyDesc')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-sahaaya-border">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleExportData}
            icon={<Download className="w-5 h-5 text-sahaaya-primary" />}
          >
            {t('settingsExportData')}
          </Button>

          <Button
            variant="danger"
            size="lg"
            onClick={() => setIsResetModalOpen(true)}
            icon={<Trash2 className="w-5 h-5" />}
          >
            {t('settingsResetData')}
          </Button>
        </div>
      </Card>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={t('settingsResetData')}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-lg text-sahaaya-text font-bold leading-relaxed">
                {t('settingsResetConfirm')}
              </p>
              <p className="text-base text-sahaaya-muted mt-2">
                This will erase all your reminders, contacts, and custom settings on this device.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sahaaya-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsResetModalOpen(false)}
            >
              {t('btnCancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleResetData}
            >
              {t('settingsResetData')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
