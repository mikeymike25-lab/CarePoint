import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import {
  chatbubbleOutline,
  closeOutline,
  send,
  trashOutline,
  shieldCheckmarkOutline,
  chevronDownOutline,
  medkitOutline,
  alertCircleOutline,
  openOutline,
  informationCircleOutline
} from 'ionicons/icons';
import {
  sendSymptomMessage,
  type ChatMessage
} from '../services/geminiChatService';
import { resolveMedicineImageUrl, type CatalogMedicineData } from '../data/medicines';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'carepoint_chatbot_conversation';

let idSequence = 0;
const createUniqueId = (prefix: string) => `${prefix}-${(++idSequence).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const QUICK_SYMPTOMS = [
  { label: 'Headache & Fever', query: 'I have a throbbing headache and slight fever since morning.' },
  { label: 'Runny Nose & Colds', query: 'I have a runny nose, clogged sinuses, and sneezing.' },
  { label: 'Cough with Phlegm', query: 'I have a persistent cough with sticky phlegm.' },
  { label: 'Acid Reflux & Heartburn', query: 'My stomach burns after eating and I feel hyperacidic.' },
  { label: 'Diarrhea & Loose Stool', query: 'I have watery loose bowel movement and stomach discomfort.' },
  { label: 'Allergies & Itching', query: 'I have itchy skin hives and allergic sneezing.' },
];

const INITIAL_MESSAGE: ChatMessage = {
  id: 'msg-welcome',
  sender: 'assistant',
  text: `Hello! I'm your **CarePoint Health & OTC Medicine Assistant** 🩺

Feel free to describe any symptoms you are experiencing (e.g., headache, fever, cough, stomach acidity, muscle pain), and I will:
1. 🩺 Provide a gentle symptom overview
2. 💊 Suggest safe **Over-The-Counter (OTC)** medicines from our catalog
3. 📋 Share dosage directions and self-care tips
4. ⚠️ Highlight warning signs if you should see a doctor

*How can I help you feel better today?*`,
  timestamp: new Date(),
};

/**
 * Clean, soft Markdown renderer for clinical responses
 */
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const isEmergency =
    text.includes('🚨') ||
    text.toLowerCase().includes('emergency warning') ||
    text.toLowerCase().includes('emergency alert');

  const lines = text.split('\n');

  const parseBoldItalic = (content: string): React.ReactNode => {
    if (!content.includes('*')) {
      return content;
    }

    const parts: React.ReactNode[] = [];
    // Match **bold** or *italic*
    const regex = /(\*\*(.+?)\*\*|\*([^*]+)\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const plain = content.substring(lastIndex, match.index).replace(/\*\*/g, '');
        if (plain) parts.push(plain);
      }

      if (match[2]) {
        // **bold**
        parts.push(
          <strong key={`b-${match.index}`} className="font-semibold text-slate-900">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // *italic*
        parts.push(
          <em key={`i-${match.index}`} className="italic text-slate-500">
            {match[3]}
          </em>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      const remaining = content.substring(lastIndex).replace(/\*\*/g, '');
      if (remaining) parts.push(remaining);
    }

    return parts.length > 0 ? parts : content.replace(/\*\*/g, '');
  };

  const renderFormattedLine = (line: string, idx: number) => {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      return <div key={idx} className="h-1.5" />;
    }

    // Emergency highlight line
    if (
      trimmed.includes('🚨') ||
      trimmed.includes('CRITICAL MEDICAL EMERGENCY') ||
      trimmed.includes('MEDICAL EMERGENCY ALERT')
    ) {
      return (
        <div
          key={idx}
          className="p-2.5 my-1.5 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-800 font-medium text-xs flex items-start gap-2"
        >
          <IonIcon icon={alertCircleOutline} className="text-base text-rose-600 shrink-0 mt-0.5" />
          <span>{trimmed.replace(/\*\*/g, '')}</span>
        </div>
      );
    }

    // Explicit Markdown headings (### Heading, ## Heading, # Heading)
    if (/^#{1,4}\s+/.test(trimmed)) {
      const cleanHeading = trimmed
        .replace(/^#{1,4}\s+/, '')
        .replace(/\*\*/g, '')
        .replace(/^\*|\*$/g, '')
        .trim();
      return (
        <h4 key={idx} className="text-xs font-bold text-slate-900 mt-2 mb-0.5 tracking-tight">
          {cleanHeading}
        </h4>
      );
    }

    // Standalone section headers (e.g. 💊 **Recommended CarePoint Medicines** or **Safe Usage & Dosage:**)
    // Strips any raw asterisks so the header renders cleanly and bold without markdown symbols
    const sectionHeaderMatch = trimmed.match(/^([^\w\s*]*\s*)?\*\*([^*]+)\*\*:?$/);
    if (sectionHeaderMatch) {
      const emojiPrefix = (sectionHeaderMatch[1] || '').trim();
      const headerTitle = sectionHeaderMatch[2].trim();
      return (
        <h4 key={idx} className="text-xs font-bold text-slate-900 mt-2 mb-0.5 tracking-tight flex items-center gap-1">
          {emojiPrefix && <span>{emojiPrefix}</span>}
          <span>{headerTitle}</span>
        </h4>
      );
    }

    // Bullet point lines (must start with •, -, or * followed by a space)
    // Does NOT match ** which is bold text
    if (/^([•\-*])\s+/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^([•\-*])\s+/, '');
      return (
        <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 my-0.5 pl-1 leading-relaxed">
          <span className="text-teal-600 font-semibold shrink-0 leading-tight">•</span>
          <span className="flex-1">{parseBoldItalic(bulletContent)}</span>
        </div>
      );
    }

    // Numbered list (e.g. "1. Step")
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      return (
        <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600 my-0.5 pl-1 leading-relaxed">
          <span className="text-teal-600 font-semibold shrink-0">{numberedMatch[1]}.</span>
          <span className="flex-1">{parseBoldItalic(numberedMatch[2])}</span>
        </div>
      );
    }

    // Standard paragraph line
    return (
      <p key={idx} className="text-xs text-slate-700 my-0.5 leading-relaxed">
        {parseBoldItalic(line)}
      </p>
    );
  };

  return (
    <div className={`space-y-0.5 ${isEmergency ? 'border-l-2 border-rose-400 pl-2' : ''}`}>
      {lines.map((line, idx) => renderFormattedLine(line, idx))}
    </div>
  );
};

export const CarePointChatbot: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Screen/Route guard: automatically hide the chatbot on auth screens,
  // staff/admin backends, and active messaging/pharmacy conversation screens
  // so it never blocks the pharmacy chat input or send button.
  const isHiddenRoute = React.useMemo(() => {
    // 1. Not authenticated -> hide chatbot (e.g. before logging in)
    if (!isAuthenticated && !user) return true;

    const path = location.pathname.toLowerCase();

    // 2. Auth screens or root
    if (path === '/' || path.startsWith('/login') || path.startsWith('/register')) {
      return true;
    }

    // 3. Pharmacy / Inquiry Chat screen (/customer/messages/:type/:id or any chat screen)
    // Completely unblocks the send button and message input bar
    if (path.includes('/messages') || path.includes('/chat')) {
      return true;
    }

    // 4. Medicine Detail — has a fixed bottom "Add to Cart / Inquire" action bar.
    // The FAB sits at bottom-20 on mobile and covers that button entirely.
    if (path.includes('/customer/medicine/')) {
      return true;
    }

    // 5. Staff and Admin portals (Customer OTC assistant is exclusively for the customer shopping portal)
    if (path.startsWith('/staff') || path.startsWith('/admin')) {
      return true;
    }

    return false;
  }, [user, isAuthenticated, location.pathname]);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch {
      // Ignore parse error
    }
    return [INITIAL_MESSAGE];
  });

  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasApiKey = Boolean(
    (import.meta.env.VITE_GEMINI_API_KEY || '').trim() &&
    import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here'
  );

  // Save conversation in session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage error
    }
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const toggleChat = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: createUniqueId('user'),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'msg-welcome' && m.sender !== 'system')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          text: m.text,
        }));

      const response = await sendSymptomMessage(text, history);

      const botMessage: ChatMessage = {
        id: createUniqueId('bot'),
        sender: 'assistant',
        text: response.text,
        timestamp: new Date(),
        suggestedMedicines: response.suggestedMedicines,
        isEmergencyAlert: response.isEmergency,
        isFallback: response.isFallback,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: createUniqueId('err'),
        sender: 'assistant',
        text: `⚠️ An error occurred while analyzing symptoms: ${err.message || 'Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const handleNavigateToMedicine = (medicine: CatalogMedicineData) => {
    if (location.pathname.startsWith('/customer')) {
      navigate(`/customer/medicine/${medicine.item_id}`);
    } else {
      navigate('/customer/search', { state: { category: medicine.brand_name } });
    }
  };

  // Close chat window if user navigates to a route where chatbot should be hidden
  useEffect(() => {
    if (isHiddenRoute && isOpen) {
      setIsOpen(false);
    }
  }, [isHiddenRoute, isOpen]);

  if (isHiddenRoute) {
    return null;
  }

  return (
    <>
      {/* ============================================================
          MINIMALIST CIRCULAR FLOATING LAUNCHER (Lower Right)
          ============================================================ */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[99999] pointer-events-auto">
        <button
          onClick={toggleChat}
          aria-label={isOpen ? 'Close CarePoint Chat' : 'Open CarePoint Chat'}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-[0_4px_16px_rgba(13,148,136,0.25)] border border-teal-500/20 active:scale-95 transition-all duration-200 ${
            isOpen
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
        >
          <IonIcon
            icon={isOpen ? closeOutline : chatbubbleOutline}
            className={`text-xl transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        </button>
      </div>

      {/* ============================================================
          SOFT THEMED CHAT WINDOW PANEL
          ============================================================ */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="CarePoint AI Health Assistant"
          className="fixed bottom-34 right-4 sm:bottom-20 sm:right-6 z-[99999] w-[calc(100vw-24px)] sm:w-[420px] md:w-[440px] h-[560px] max-h-[82vh] bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col overflow-hidden pointer-events-auto"
        >
          {/* Header - Spacious, Clean CarePoint Green/Teal */}
          <div className="bg-teal-600 px-5 py-4 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-xs">
                <IonIcon icon={medkitOutline} className="text-lg" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-300 ring-2 ring-teal-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white tracking-tight truncate leading-tight">
                  CarePoint Assistant
                </h3>
                <p className="text-xs text-teal-100/90 font-normal mt-0.5 truncate leading-tight">
                  OTC Health & Medicine Advisor
                </p>
              </div>
            </div>

            {/* Header Action Buttons & Badge */}
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <span className="bg-teal-700/70 border border-teal-400/40 text-teal-100 text-[10px] px-2 py-0.5 rounded-full font-medium">
                OTC Only
              </span>
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="w-8 h-8 flex items-center justify-center text-teal-100 hover:text-white hover:bg-white/15 rounded-full transition"
              >
                <IonIcon icon={trashOutline} className="text-sm" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="w-8 h-8 flex items-center justify-center text-teal-100 hover:text-white hover:bg-white/15 rounded-full transition"
              >
                <IonIcon icon={chevronDownOutline} className="text-base" />
              </button>
            </div>
          </div>

          {/* Soft Disclaimer Strip */}
          <div className="bg-teal-50 border-b border-teal-100/70 px-4 py-2 flex items-center gap-2 shrink-0">
            <IonIcon icon={shieldCheckmarkOutline} className="text-teal-600 text-sm shrink-0" />
            <p className="text-[11px] text-teal-900 font-medium leading-tight">
              Informational OTC guidance only. Consult a doctor for severe illness.
            </p>
          </div>

          {/* Missing API Key Notice (soft subtle warning if key is not yet pasted in .env) */}
          {!hasApiKey && (
            <div className="bg-amber-50/80 border-b border-amber-100 px-3.5 py-1.5 flex items-start gap-1.5 shrink-0 text-amber-900">
              <IonIcon icon={informationCircleOutline} className="text-amber-600 text-xs shrink-0 mt-0.5" />
              <div className="text-[10px] leading-tight text-amber-800">
                <span className="font-semibold">Setup Tip: </span>
                Add <code className="bg-amber-100/80 text-amber-900 px-1 py-0.2 rounded font-mono text-[9px]">VITE_GEMINI_API_KEY</code> to <code className="font-mono text-[9px]">.env</code> for full AI responses. Operating in verified OTC catalog mode.
              </div>
            </div>
          )}

          {/* Messages Container with Soft Slate Background */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F8FAFC]">
            {messages.map((message) => {
              const isUser = message.sender === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs ${
                      isUser
                        ? 'bg-teal-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-150 rounded-tl-xs shadow-[0_2px_6px_rgba(0,0,0,0.02)]'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                    ) : (
                      <FormattedMessage text={message.text} />
                    )}

                    <div
                      className={`text-[9px] mt-1 font-medium ${
                        isUser ? 'text-teal-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Soft Medicine Suggestion Cards */}
                  {!isUser && message.suggestedMedicines && message.suggestedMedicines.length > 0 && (
                    <div className="mt-2 w-full max-w-[92%] space-y-1.5">
                      <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 pl-1">
                        <IonIcon icon={medkitOutline} className="text-teal-600" />
                        <span>Recommended from CarePoint:</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {message.suggestedMedicines.map((med) => (
                          <div
                            key={med.item_id}
                            className="bg-white border border-slate-200/90 hover:border-teal-400/80 rounded-2xl p-2.5 shadow-xs hover:shadow-sm transition-all flex items-center gap-3"
                          >
                            {/* Medicine Image Thumbnail */}
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shrink-0 overflow-hidden relative shadow-2xs">
                              <img
                                src={resolveMedicineImageUrl(med.image_url || med.slug || med.brand_name)}
                                alt={med.brand_name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/medicines/biogesic.jpg';
                                }}
                              />
                              {med.requires_prescription && (
                                <span className="absolute top-0.5 left-0.5 bg-rose-600 text-white text-[7px] font-black px-1 rounded uppercase tracking-tighter">
                                  Rx
                                </span>
                              )}
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="font-bold text-xs text-slate-900 truncate">
                                  {med.brand_name}
                                </h5>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 shrink-0">
                                  ₱{med.price.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {med.generic_name} • {med.dosage_form}
                              </p>
                            </div>

                            {/* Action Button */}
                            <button
                              type="button"
                              onClick={() => handleNavigateToMedicine(med)}
                              className="shrink-0 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 font-semibold text-[11px] rounded-xl transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                            >
                              <span>View</span>
                              <IonIcon icon={openOutline} className="text-[11px]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Soft Typing Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
                  <IonIcon icon={medkitOutline} className="text-xs" />
                </div>
                <div className="bg-white border border-slate-150 rounded-2xl rounded-tl-xs px-3 py-2 shadow-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></span>
                    <span className="text-[10.5px] text-slate-400 font-normal ml-1">
                      Checking symptoms & OTC catalog...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Symptom Chips - Soft Pills */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto whitespace-nowrap hide-scrollbar flex items-center gap-1.5 shrink-0">
            {QUICK_SYMPTOMS.map((item, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSendMessage(item.query)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200/60 hover:border-teal-200 rounded-full text-[10.5px] font-normal transition shrink-0 active:scale-95 disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Input Area - Clean Minimalist Pill Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe symptoms (e.g. fever, headache, cough)..."
              disabled={isLoading}
              className="flex-1 bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2 rounded-full border border-slate-200/80 focus:border-teal-400 focus:bg-white focus:outline-none transition"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="w-8 h-8 flex items-center justify-center bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white rounded-full transition active:scale-95 shrink-0"
              aria-label="Send message"
            >
              <IonIcon icon={send} className="text-xs" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default CarePointChatbot;
