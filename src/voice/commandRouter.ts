import type { PageView } from '../components/Navigation';

export type VoiceCommand =
  | { type: 'navigate'; page: PageView; say: { ml: string; en: string } }
  | { type: 'help'; text: string; say: { ml: string; en: string } }
  | { type: 'chat'; text: string; say: { ml: string; en: string } };

const nav = (page: PageView, ml: string, en: string): VoiceCommand => ({ type: 'navigate', page, say: { ml, en } });

// Phrases that CREATE a reminder go to the assistant (it needs the time and a confirmation), not to the reminders list.
const CREATE_REMINDER = /ഓർമ്മിപ്പിക്ക|ഓർമ്മപ്പെടുത്തണം|remind me|set a reminder/i;
const HELP_NEED =
  /വാങ്ങ|ആശുപത്രി|ഡോക്ടർ|ബാങ്ക്|റേഷൻ|പലചരക്ക്|യാത്ര|കൊണ്ടുപോ|സഹായം (വേണം|ചോദിക്ക)|സഹായിക്കാമോ|buy|bring|groceries|medicine|hospital|bank|ration|need (some)?one|ride|help me/i;

/**
 * Turns a spoken sentence into an app action. Deterministic on purpose: navigation by voice must be instant and
 * predictable, and must never trigger anything irreversible. SOS only OPENS the SOS screen (its own confirmation
 * still applies); help requests only PRE-FILL the help flow (the senior still reviews and confirms).
 */
export function routeVoiceCommand(raw: string): VoiceCommand {
  const text = raw.trim();
  const t = text.toLowerCase();

  if (/അടിയന്തര|ആംബുലൻസ്|അപകടം|\bsos\b|emergency|ambulance/.test(t)) {
    return nav('sos', 'അടിയന്തര സഹായ പേജ് തുറക്കുന്നു', 'Opening emergency help');
  }
  if (CREATE_REMINDER.test(t)) {
    return { type: 'chat', text, say: { ml: 'ശരി, ഓർമ്മപ്പെടുത്തൽ തയ്യാറാക്കാം', en: 'Okay, let me prepare that reminder' } };
  }
  if (/ഇന്ന്.*(എന്തൊക്കെ|എന്ത്)|what.*(today|to do)/.test(t)) {
    return { type: 'chat', text, say: { ml: 'ഇന്നത്തെ കാര്യങ്ങൾ നോക്കാം', en: "Let's look at today" } };
  }
  if (/ഓർമ്മ|റിമൈൻഡർ|മരുന്ന് (സമയം|ഓർമ്മ)|reminder/.test(t)) {
    return nav('reminders', 'ഓർമ്മപ്പെടുത്തലുകൾ തുറക്കുന്നു', 'Opening reminders');
  }
  if (/കുടുംബ|മക്കൾ|മകൾ|മകൻ|മകളെ|മകനെ|വിളിക്കണം|call (my )?(daughter|son)|family/.test(t) && !HELP_NEED.test(t)) {
    return nav('family', 'കുടുംബ പേജ് തുറക്കുന്നു', 'Opening family');
  }
  if (/രേഖ|സന്ദേശം|എസ്എംഎസ്|document|message|letter/.test(t) && !HELP_NEED.test(t)) {
    return nav('explainer', 'രേഖകൾ മനസ്സിലാക്കാം പേജ് തുറക്കുന്നു', 'Opening document help');
  }
  if (/ക്രമീകരണ|സെറ്റിംഗ്|settings/.test(t)) {
    return nav('settings', 'ക്രമീകരണങ്ങൾ തുറക്കുന്നു', 'Opening settings');
  }
  if (/^(ഹോം|home|തിരികെ|പിന്നോട്ട്|back)\b|ഹോമിലേക്ക്|go home/.test(t)) {
    return nav('home', 'ഹോമിലേക്ക് പോകുന്നു', 'Going home');
  }
  if (HELP_NEED.test(t)) {
    return { type: 'help', text, say: { ml: 'ശരി, സഹായം ചോദിക്കാം. ശരിയാണോ എന്ന് നോക്കൂ', en: 'Okay, let us ask for help. Please check it' } };
  }
  if (/സഹായം|help/.test(t)) {
    return nav('help', 'സഹായം ചോദിക്കാം', 'Let us ask for help');
  }
  return { type: 'chat', text, say: { ml: 'ഞാൻ കേട്ടു', en: 'I heard you' } };
}
