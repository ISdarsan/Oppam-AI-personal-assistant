import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { HelpRequestPage } from '../pages/HelpRequestPage';
import { SOSPage } from '../pages/SOSPage';
import { RequestTracker } from '../components/RequestTracker';
import { api } from '../services/api';
import { session } from '../services/session';
import { CommunityRequest } from '../types/community';

const wrap = (ui: React.ReactElement) =>
  render(
    <LanguageProvider>
      <AuthProvider>{ui}</AuthProvider>
    </LanguageProvider>
  );

const baseRequest: CommunityRequest = {
  request_id: 'req_abc123def4',
  senior_id: 'senior_001',
  senior_name: 'Lakshmi',
  title: 'മരുന്ന് വാങ്ങാൻ സഹായം',
  category: 'medicine',
  description: 'x',
  priority: 'normal',
  location_hint: null,
  status: 'OPEN',
  helper_id: null,
  helper_name: null,
  created_at: '2026-11-07T10:00:00',
  updated_at: '2026-11-07T10:00:00',
};

describe('Community experience', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('login page is Malayalam by default and signs in with the chosen role', async () => {
    const login = vi.spyOn(api, 'login').mockResolvedValue({ user_id: 'helper_001', name: 'അനിൽ', role: 'helper', token: 't' });
    wrap(<LoginPage />);
    expect(screen.getByText('ഇന്ന് ആരാണ് പ്രവേശിക്കുന്നത്?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/സഹായി \(സന്നദ്ധ പ്രവർത്തകൻ\)/));
    fireEvent.change(screen.getByLabelText('നിങ്ങളുടെ പേര്'), { target: { value: 'അനിൽ' } });
    fireEvent.click(screen.getByRole('button', { name: 'പ്രവേശിക്കുക' }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('അനിൽ', 'helper'));
    await waitFor(() => expect(session.get()?.role).toBe('helper'));
  });

  it('never creates a request until the senior confirms the AI draft', async () => {
    const interpret = vi.spyOn(api, 'interpretRequest').mockResolvedValue({
      interpreted: { title: 'മരുന്ന് വാങ്ങാൻ സഹായം', category: 'medicine', description: 'ഗുളിക വേണം', priority: 'normal', requires_confirmation: true },
      source: 'ollama',
      model_used: 'gemma3:4b',
      spoken_response: '',
      created: false,
    });
    const create = vi.spyOn(api, 'createRequest').mockResolvedValue({ ...baseRequest });
    vi.spyOn(api, 'listRequests').mockResolvedValue({ requests: [baseRequest], count: 1 });

    wrap(<HelpRequestPage initialText="ഗുളിക വേണം" onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'തുടരുക' }));
    await screen.findByText('ഇതാണോ വേണ്ടത്?');
    expect(interpret).toHaveBeenCalledWith('ഗുളിക വേണം', 'ml');
    expect(create).not.toHaveBeenCalled(); // draft shown, nothing created yet

    fireEvent.click(screen.getByRole('button', { name: 'അതെ, സഹായം ചോദിക്കുക' }));
    await screen.findByText('അഭ്യർത്ഥന അയച്ചു');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({ category: 'medicine', description: 'ഗുളിക വേണം' });
  });

  it('shows an understandable error (and creates nothing) when the AI call fails', async () => {
    vi.spyOn(api, 'interpretRequest').mockRejectedValue(new Error('boom'));
    const create = vi.spyOn(api, 'createRequest');
    wrap(<HelpRequestPage initialText="മരുന്ന്" onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'തുടരുക' }));
    await screen.findByRole('alert');
    expect(create).not.toHaveBeenCalled();
  });

  it('SOS needs an explicit confirmation and states it is in-app only', async () => {
    const sos = vi.spyOn(api, 'triggerSos').mockResolvedValue({
      event_id: 'sos_1', senior_id: 's', senior_name: 'L', message: null, location_hint: null, status: 'ACTIVE',
      acknowledged_by: null, acknowledged_at: null, created_at: '2026-11-07T10:00:00', notified_family_count: 1,
    });
    vi.spyOn(api, 'listSos').mockResolvedValue({ events: [], count: 0 });
    wrap(<SOSPage onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /അടിയന്തര സഹായം/ }));
    expect(sos).not.toHaveBeenCalled(); // first tap only asks
    fireEvent.click(await screen.findByRole('button', { name: 'അതെ, അറിയിക്കുക' }));
    await screen.findByText('അറിയിപ്പ് അയച്ചു');
    expect(sos).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/പോലീസിനെയോ ആംബുലൻസിനെയോ അറിയിക്കുന്നില്ല/)).toBeInTheDocument();
  });

  it('SOS can be cancelled without alerting anyone', async () => {
    const sos = vi.spyOn(api, 'triggerSos');
    vi.spyOn(api, 'listSos').mockResolvedValue({ events: [], count: 0 });
    wrap(<SOSPage onHome={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /അടിയന്തര സഹായം/ }));
    fireEvent.click(await screen.findByRole('button', { name: /വേണ്ട, തിരികെ പോകുക/ }));
    expect(sos).not.toHaveBeenCalled();
  });

  it('request tracker shows the real status and helper only when assigned', () => {
    const { rerender } = wrap(<RequestTracker request={baseRequest} />);
    expect(screen.getByText('സഹായിയെ തിരയുന്നു')).toBeInTheDocument();
    expect(screen.getByText('ഒരു സഹായിക്കായി കാത്തിരിക്കുന്നു…')).toBeInTheDocument();
    rerender(
      <LanguageProvider>
        <AuthProvider>
          <RequestTracker request={{ ...baseRequest, status: 'ON_THE_WAY', helper_id: 'helper_001', helper_name: 'അനിൽ' }} />
        </AuthProvider>
      </LanguageProvider>
    );
    expect(screen.getByText('സഹായി വരുന്നു')).toBeInTheDocument();
    expect(screen.getByText('അനിൽ')).toBeInTheDocument();
  });

  it('an invalid session (HTTP 401) signs the user out instead of failing silently', async () => {
    session.set({ user_id: 'senior_001', name: 'L', role: 'senior', token: 'stale' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ detail: { code: 'INVALID_TOKEN', message: 'Unknown or expired token.' } }),
    }));
    await expect(api.listRequests()).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
    expect(session.get()).toBeNull();
    vi.unstubAllGlobals();
  });
});
