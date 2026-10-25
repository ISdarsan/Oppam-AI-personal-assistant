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
import { triggerHapticFeedback } from '../utils/communication';

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
    triggerHapticFeedback(60);
    updateSettings({
      displayName: displayName.trim(),
      autoSpeak,
      speechRate,
    });
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3000);
  };

  const handleExportData = () => {
    triggerHapticFeedback(50);
    const jsonStr = storage.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `koode_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    triggerHapticFeedback(80);
    storage.clearAllData();
    setIsResetModalOpen(false);
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Title */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
          {t('settingsTitle')}
        </h2>
        <p className="text-lg sm:text-xl text-emerald-900/80 mt-1 font-medium">{t('settingsSubtitle')}</p>
      </div>

      {/* 1. Language & Display Name Card */}
      <Card className="flex flex-col gap-7 bg-white p-6 sm:p-9 border-2 border-stone-200">
        {/* Language selector */}
        <div className="flex flex-col gap-3.5">
          <label className="text-2xl font-black text-emerald-950 flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-emerald-800" strokeWidth={2.5} />
            <span>{t('settingsLanguage')}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  triggerHapticFeedback(30);
                  setLanguage(lang.code);
                }}
                className={`py-3.5 px-3 rounded-2xl font-black border-2 transition-all min-h-[56px] text-center flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                  language === lang.code
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-md scale-102'
                    : 'bg-white text-emerald-950 border-stone-300 hover:border-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span className="text-base sm:text-lg">{lang.nativeName}</span>
                <span className={`text-xs ${language === lang.code ? 'text-emerald-100 font-medium' : 'text-stone-500 font-medium'}`}>
                  {lang.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Display name */}
        <div className="flex flex-col gap-2.5 pt-5 border-t-2 border-stone-200 max-w-lg">
          <Input
            label={t('settingsDisplayName')}
            placeholder={t('settingsDisplayNamePlaceholder')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Text size selector */}
        <div className="flex flex-col gap-3.5 pt-5 border-t-2 border-stone-200">
          <label className="text-2xl font-black text-emerald-950 flex items-center gap-2.5">
            <Type className="w-6 h-6 text-emerald-800" strokeWidth={2.5} />
            <span>{t('settingsTextSize')}</span>
          </label>
          <div className="grid grid-cols-3 gap-3.5 max-w-lg">
            {(['normal', 'large', 'xlarge'] as TextSize[]).map((size) => (
              <button
                key={size}
                onClick={() => {
                  triggerHapticFeedback(30);
                  setTextSize(size);
                }}
                className={`py-3.5 px-4 rounded-2xl font-black border-2 transition-all min-h-[56px] capitalize cursor-pointer active:scale-95 ${
                  textSize === size
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-md scale-102'
                    : 'bg-white text-emerald-950 border-stone-300 hover:border-emerald-700 hover:bg-emerald-50'
                } ${
                  size === 'normal'
                    ? 'text-lg'
                    : size === 'large'
                    ? 'text-xl'
                    : 'text-2xl'
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
        <div className="flex flex-col gap-5 pt-5 border-t-2 border-stone-200">
          <h3 className="text-2xl font-black text-emerald-950 flex items-center gap-2.5">
            <Volume2 className="w-6 h-6 text-emerald-800" strokeWidth={2.5} />
            <span>{t('settingsSpeech')}</span>
          </h3>

          <label className="flex items-center gap-3.5 cursor-pointer min-h-[52px] p-3 rounded-2xl hover:bg-stone-50 border border-transparent hover:border-stone-200">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="w-7 h-7 rounded-lg text-emerald-800 focus:ring-emerald-700 accent-emerald-800 cursor-pointer"
            />
            <span className="text-xl font-bold text-emerald-950">
              {t('settingsAutoSpeak')}
            </span>
          </label>

          <div className="flex flex-col gap-2.5 max-w-lg">
            <label className="text-lg font-bold text-emerald-950">
              {t('settingsSpeechRate')}: <span className="text-emerald-800 font-black">{speechRate <= 0.85 ? t('settingsSpeechSlow') : t('settingsSpeechNormal')}</span>
            </label>
            <input
              type="range"
              min="0.7"
              max="1.2"
              step="0.05"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full accent-emerald-800 cursor-pointer min-h-[48px]"
            />
          </div>
        </div>

        <div className="pt-5 border-t-2 border-stone-200 flex items-center gap-4">
          <Button onClick={handleSaveProfile} size="lg" className="text-xl font-black">
            {t('btnSave')}
          </Button>
          {saveFeedback && (
            <span className="text-emerald-800 font-black text-lg flex items-center gap-2 animate-fadeIn bg-emerald-100 px-4 py-2 rounded-2xl border border-emerald-300">
              <CheckCircle className="w-6 h-6" />
              <span>{t('btnSave')} ✓</span>
            </span>
          )}
        </div>
      </Card>

      {/* 2. Open-Weight AI Health & Status Card */}
      <Card className="flex flex-col gap-5 bg-white p-6 sm:p-9 border-2 border-stone-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center flex-shrink-0 border-2 border-emerald-300">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">
                {t('settingsAIStatus')}
              </h3>
              <p className="text-base text-stone-600 font-medium">
                Ollama local inference engine
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHapticFeedback(30);
              checkHealth();
            }}
            disabled={isCheckingHealth}
            className="p-3.5 rounded-2xl border-2 border-stone-300 hover:bg-stone-50 text-emerald-900 min-h-[50px] min-w-[50px] flex items-center justify-center cursor-pointer active:scale-95"
            aria-label="Refresh AI health status"
            title="Refresh status"
          >
            <RefreshCw className={`w-6 h-6 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-stone-50 rounded-3xl p-6 border-2 border-stone-200 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-emerald-950">
              {t('settingsModelInfo')}
            </span>
            <code className="text-lg font-black bg-white px-3.5 py-1.5 rounded-xl border-2 border-stone-300 text-emerald-900 font-mono">
              {health?.configured_model || 'gemma2:2b'}
            </code>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-emerald-950">Status:</span>
            {health?.status === 'healthy' ? (
              <Badge variant="success" icon={<CheckCircle className="w-5 h-5" />}>
                {t('settingsConnected')}
              </Badge>
            ) : health?.status === 'degraded' ? (
              <Badge variant="warning" icon={<AlertTriangle className="w-5 h-5" />}>
                Model not pulled
              </Badge>
            ) : (
              <Badge variant="danger" icon={<AlertTriangle className="w-5 h-5" />}>
                {t('settingsDisconnected')}
              </Badge>
            )}
          </div>

          <p className="text-lg text-emerald-950/80 mt-1 leading-relaxed font-medium">
            {health?.message || 'Checking local AI endpoint at http://localhost:11434...'}
          </p>

          {health?.status !== 'healthy' && (
            <div className="bg-white rounded-2xl p-5 border-2 border-stone-200 text-base text-emerald-950 font-mono">
              <p className="font-black mb-1.5 font-sans text-emerald-900">To start local AI:</p>
              <code>1. ollama serve</code><br />
              <code>2. ollama run gemma2:2b</code>
            </div>
          )}
        </div>
      </Card>

      {/* 3. Data & Privacy Card */}
      <Card className="flex flex-col gap-6 bg-white p-6 sm:p-9 border-2 border-stone-200">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center flex-shrink-0 border-2 border-emerald-300">
            <ShieldCheck className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">
              {t('settingsDataPrivacy')}
            </h3>
            <p className="text-lg text-emerald-950/80 mt-1.5 leading-relaxed font-medium">
              {t('settingsDataPrivacyDesc')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-stone-200">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleExportData}
            icon={<Download className="w-6 h-6 text-emerald-800" />}
          >
            {t('settingsExportData')}
          </Button>

          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              triggerHapticFeedback(40);
              setIsResetModalOpen(true);
            }}
            icon={<Trash2 className="w-6 h-6" />}
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
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 border-2 border-rose-300">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xl text-emerald-950 font-bold leading-relaxed">
                {t('settingsResetConfirm')}
              </p>
              <p className="text-base text-stone-600 mt-2 font-medium">
                This will erase all your reminders, contacts, and custom settings on this device.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3.5 pt-5 border-t-2 border-stone-200">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setIsResetModalOpen(false)}
            >
              {t('btnCancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="lg"
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
