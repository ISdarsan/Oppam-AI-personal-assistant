import { describe, it, expect } from 'vitest';
import { routeVoiceCommand } from '../voice/commandRouter';

describe('voice command router', () => {
  it.each([
    ['ഓർമ്മപ്പെടുത്തലുകൾ കാണിക്കൂ', 'reminders'],
    ['open my reminders', 'reminders'],
    ['കുടുംബം തുറക്കൂ', 'family'],
    ['ഹോമിലേക്ക് പോകൂ', 'home'],
    ['go home', 'home'],
    ['ക്രമീകരണങ്ങൾ', 'settings'],
    ['ഈ സന്ദേശം മനസ്സിലാക്കണം', 'explainer'],
  ])('"%s" navigates to %s', (text, page) => {
    const cmd = routeVoiceCommand(text);
    expect(cmd).toMatchObject({ type: 'navigate', page });
  });

  it('emergency phrases only OPEN the SOS screen (its confirmation step still applies)', () => {
    for (const t of ['അടിയന്തര സഹായം വേണം', 'I need an ambulance', 'SOS', 'emergency']) {
      const cmd = routeVoiceCommand(t);
      expect(cmd.type).toBe('navigate'); // never a direct send
      expect(cmd).toMatchObject({ page: 'sos' });
    }
  });

  it('needs ("buy medicine", "hospital") pre-fill the help flow, they never create a request', () => {
    for (const t of ['എനിക്ക് മരുന്ന് വാങ്ങണം', 'I need someone to buy my medicine', 'ആശുപത്രിയിൽ പോകണം']) {
      expect(routeVoiceCommand(t)).toMatchObject({ type: 'help', text: t });
    }
  });

  it('phrases that CREATE a reminder go to the assistant, not to the reminders list', () => {
    expect(routeVoiceCommand('രാത്രി 8 മണിക്ക് ഗുളിക ഓർമ്മിപ്പിക്കൂ').type).toBe('chat');
    expect(routeVoiceCommand('remind me to call Lakshmi').type).toBe('chat');
  });

  it('"what do I have today" and unknown speech go to the assistant chat', () => {
    expect(routeVoiceCommand('ഇന്ന് എനിക്ക് എന്തൊക്കെ ചെയ്യാനുണ്ട്?').type).toBe('chat');
    expect(routeVoiceCommand('നമസ്കാരം').type).toBe('chat');
  });

  it('every command carries a spoken confirmation in both languages', () => {
    for (const t of ['ഹോം', 'emergency', 'മരുന്ന് വാങ്ങണം', 'hello']) {
      const cmd = routeVoiceCommand(t);
      expect(cmd.say.ml.length).toBeGreaterThan(0);
      expect(cmd.say.en.length).toBeGreaterThan(0);
    }
  });

  it('the three conversation test sentences are routed correctly', () => {
    expect(routeVoiceCommand('നമസ്കാരം, എനിക്ക് ഇന്ന് എന്തൊക്കെ ചെയ്യാനുണ്ട്?').type).toBe('chat');
    expect(routeVoiceCommand('എനിക്ക് മരുന്ന് വാങ്ങാൻ സഹായം വേണം.').type).toBe('help');
    expect(routeVoiceCommand('എനിക്ക് സുഖമില്ല, മകളെ വിളിക്കണം.')).toMatchObject({ type: 'navigate', page: 'family' });
  });
});
