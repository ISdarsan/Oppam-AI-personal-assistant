import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock SpeechSynthesis
class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = 'en';
  rate: number = 1;
  pitch: number = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

(window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
(window as any).speechSynthesis = {
  speak: (utterance: any) => {
    if (utterance.onstart) utterance.onstart();
    if (utterance.onend) setTimeout(utterance.onend, 10);
  },
  cancel: () => {},
  getVoices: () => [],
};
