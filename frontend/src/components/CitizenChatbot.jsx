import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Bot,
  User,
  RefreshCw,
  Phone,
  AlertTriangle,
  Droplet,
  CheckCircle2,
  X,
  Volume2,
  Clock,
  Compass,
  FileText
} from "lucide-react";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_MODEL = "qwen/qwen3.8-27b";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Multilingual labels for the Chatbot interface
const CHAT_I18N = {
  en: {
    botTitle: "JalMitra AI Sahayak",
    botSubtitle: "BMC Water Assistant · 24/7 Multilingual Support",
    onlineStatus: "Online · Groq LLM",
    inputPlaceholder: "Ask in English, Hindi, or Marathi...",
    listening: "Listening (English)... Speak now",
    send: "Send",
    quickPromptsLabel: "Quick Assistance:",
    prompts: [
      "When is water scheduled today?",
      "Where is my emergency tanker?",
      "Report muddy or contaminated water",
      "How is my priority score calculated?",
    ],
    welcomeMessage:
      "Hello! I am **JalMitra**, your AI Water Assistant from MCGM / BMC. How can I help you today? You can ask about water supply timings, track your relief tanker, or report water deficits in English, Hindi, or Marathi.",
    raiseTicketAction: "Raise Grievance Ticket",
    sosAction: "Call Helpline +91 8369978764",
    speechError: "Speech recognition not supported in this browser.",
  },
  hi: {
    botTitle: "जलमित्र AI सहायक",
    botSubtitle: "मनपा जल विभाग · 24/7 बहुभाषी सहायता",
    onlineStatus: "सक्रिय · Groq LLM",
    inputPlaceholder: "हिंदी, मराठी या अंग्रेजी में पूछें...",
    listening: "सुन रहे हैं (हिंदी)... बोलिए",
    send: "भेजें",
    quickPromptsLabel: "त्वरित सहायता:",
    prompts: [
      "आज पानी कब आएगा?",
      "मेरा आपातकालीन टैंकर कहाँ है?",
      "गंदे व बदबूदार पानी की शिकायत दर्ज करें",
      "राहत प्राथमिकता स्कोर कैसे तय होता है?",
    ],
    welcomeMessage:
      "नमस्ते! मैं **जलमित्र**, बृहन्मुंबई महानगरपालिका (BMC) का AI जल सहायक हूँ। मैं आपकी क्या मदद कर सकता हूँ? आप जलापूर्ति समय, टैंकर ट्रैकिंग या पानी की किल्लत के बारे में हिंदी, मराठी या अंग्रेजी में पूछ सकते हैं।",
    raiseTicketAction: "शिकायत दर्ज करें",
    sosAction: "हेल्पलाइन +91 8369978764 कॉल करें",
    speechError: "आपके ब्राउज़र में आवाज़ पहचान (Web Speech) उपलब्ध नहीं है।",
  },
  mr: {
    botTitle: "जलमित्र AI साहाय्यक",
    botSubtitle: "मनपा जल अभियंता विभाग · २४/७ थेट साहाय्य",
    onlineStatus: "सक्रिय · Groq LLM",
    inputPlaceholder: "मराठी, हिंदी किंवा इंग्रजीत विचारा...",
    listening: "ऐकत आहे (मराठी)... बोला",
    send: "पाठवा",
    quickPromptsLabel: "तातडीचे प्रश्न:",
    prompts: [
      "आज पाणी पुरवठा वेळ काय आहे?",
      "माझा आपत्कालीन टँकर कुठे आहे?",
      "गढूळ किंवा दूषित पाण्याची तक्रार नोंदवा",
      "प्राधान्य गुण (Priority Score) कसा ठरतो?",
    ],
    welcomeMessage:
      "नमस्कार! मी **जलमित्र**, बृहन्मुंबई महानगरपालिकेचा (BMC) AI जल साहाय्यक आहे. मी आपली काय मदत करू शकतो? आपण पाणी पुरवठा वेळापत्रक, टँकर ट्रॅकिंग किंवा टंचाई तक्रारीबाबत मराठी, हिंदी किंवा इंग्रजीत विचारू शकता.",
    raiseTicketAction: "तक्रार नोंदवा",
    sosAction: "हेल्पलाइन +91 8369978764 डायल करा",
    speechError: "आपल्या ब्राउझरमध्ये व्हॉइस इनपुट उपलब्ध नाही.",
  },
};

export default function CitizenChatbot({
  lang = "en",
  detectedWard,
  onOpenGrievance,
  onOpenEmergencyModal,
  onClose,
  isFloating = false,
}) {
  const t = CHAT_I18N[lang] || CHAT_I18N.en;

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: t.welcomeMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Update initial message when language changes if conversation hasn't started
  useEffect(() => {
    if (messages.length === 1) {
      setMessages([
        {
          id: 1,
          role: "assistant",
          content: t.welcomeMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [lang]);

  // Web Speech API Voice Input
  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t.speechError);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  // Call LLM: tries Backend API first, falls back to direct Groq API
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    const wardCode = detectedWard?.ward_code || "M/E";
    const wardName = detectedWard?.name || "Govandi / Mankhurd";
    const timetable = detectedWard?.timetable || "06:00 - 09:30 IST";
    const tankerId = detectedWard?.assigned_tanker?.tanker_id || "T-08";
    const driver = detectedWard?.assigned_tanker?.driver || "Rajesh Patil";
    const etaMins = detectedWard?.assigned_tanker?.eta_mins || 14;
    const otpCode = detectedWard?.assigned_tanker?.otp_code || "7419";

    const systemPrompt = `You are "JalMitra" (जलमित्र), the AI Water Operations Assistant for Brihanmumbai Municipal Corporation (BMC / मनपा).
Current Context:
- User Ward: Ward ${wardCode} (${wardName})
- Water Timetable for this ward: ${timetable}
- Active Relief Tanker: ${tankerId} (Driver: ${driver}, ETA: ${etaMins} mins)
- 4-Digit Delivery Verification OTP: ${otpCode}
- BMC Operations Helpline: +91 8369978764
- User's Preferred Language: ${lang === "hi" ? "Hindi (हिंदी)" : lang === "mr" ? "Marathi (मराठी)" : "English"}.

Instructions:
1. Respond directly, politely, and warmly in the user's language (${lang === "hi" ? "Hindi" : lang === "mr" ? "Marathi" : "English"}).
2. Provide concise, mobile-friendly answers (max 2-3 short paragraphs or bullet points).
3. If they ask about water supply, give their ward's schedule (${timetable}).
4. If they ask about emergency tankers, explain that Tanker ${tankerId} is dispatched and remind them of OTP ${otpCode}.
5. If they report contaminated water or a burst pipe, advise safe precautions and offer to raise a priority grievance.`;

    let replyText = "";

    // 1. Try Backend Proxy endpoint
    try {
      const response = await fetch(`${API_BASE}/api/citizen/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          ward_code: wardCode,
          lang: lang,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          replyText = data.reply;
        }
      }
    } catch (backendErr) {
      console.warn("Backend chat endpoint unavailable, falling back to direct Groq API:", backendErr.message);
    }

    // 2. Fallback to Direct Groq API if backend was unreachable or empty
    if (!replyText) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              ...newMessages.slice(-5).map((m) => ({ role: m.role, content: m.content })),
            ],
            max_tokens: 380,
            temperature: 0.6,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          replyText = groqData.choices?.[0]?.message?.content || "";
        }
      } catch (directErr) {
        console.warn("Direct Groq API fetch error:", directErr);
      }
    }

    // 3. Fallback to Local Municipal Knowledge if offline
    if (!replyText) {
      if (lang === "mr") {
        replyText = `वॉर्ड ${wardCode} (${wardName}) साठी आजचे पाणी वेळापत्रक ${timetable} आहे. तातडीचा टँकर ${tankerId} (ETA ${etaMins} मिनिटे) तैनात आहे. डिलिव्हरी OTP: ${otpCode}. तातडीच्या मदतीसाठी +91 8369978764 वर कॉल करा.`;
      } else if (lang === "hi") {
        replyText = `वार्ड ${wardCode} (${wardName}) के लिए आज का जलापूर्ति समय ${timetable} है। राहत टैंकर ${tankerId} (ETA ${etaMins} मिनट) रास्ते में है। डिलीवरी OTP: ${otpCode} है। हेल्पलाइन: +91 8369978764.`;
      } else {
        replyText = `For Ward ${wardCode} (${wardName}), regular water supply is scheduled for ${timetable}. Relief Tanker ${tankerId} is assigned with an ETA of ~${etaMins} mins. Delivery OTP: ${otpCode}. For emergency escalations, dial +91 8369978764.`;
      }
    }

    const assistantMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handlePromptClick = (prompt) => {
    handleSendMessage(prompt);
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden ${isFloating ? "h-[540px] max-h-[85vh] w-full sm:w-[420px]" : "h-full min-h-[480px]"}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003f87] to-[#0056b3] text-white p-3.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-sky-200 shadow-inner">
            <Bot className="w-5 h-5 text-sky-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold tracking-tight text-white">{t.botTitle}</h3>
              <span className="flex items-center space-x-1 text-[9.5px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Groq AI</span>
              </span>
            </div>
            <p className="text-[10px] text-sky-200 leading-tight">
              {detectedWard ? `Ward ${detectedWard.ward_code} · ${t.botSubtitle}` : t.botSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {onOpenEmergencyModal && (
            <button
              onClick={onOpenEmergencyModal}
              title="Emergency Water Helpline & Priority Queue (+91 8369978764)"
              className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition cursor-pointer text-xs flex items-center space-x-1 shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">+91 8369978764</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/20 text-sky-200 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Chips Banner */}
      <div className="bg-sky-50/80 border-b border-sky-100 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto custom-scroll shrink-0">
        <div className="flex items-center space-x-1 text-[11px] font-medium text-slate-600 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-sky-700" />
          <span className="font-semibold text-slate-800 text-[10.5px]">{t.quickPromptsLabel}</span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          {onOpenGrievance && (
            <button
              onClick={onOpenGrievance}
              className="px-2 py-0.5 rounded-full bg-white border border-sky-300 text-[#0056b3] text-[10.5px] font-bold hover:bg-sky-100 transition shadow-2xs cursor-pointer flex items-center space-x-1"
            >
              <FileText className="w-3 h-3" />
              <span>{t.raiseTicketAction}</span>
            </button>
          )}
          {onOpenEmergencyModal && (
            <button
              onClick={onOpenEmergencyModal}
              className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-rose-700 text-[10.5px] font-bold hover:bg-rose-100 transition shadow-2xs cursor-pointer flex items-center space-x-1"
            >
              <Phone className="w-3 h-3 text-rose-600" />
              <span>Helpline Call</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 custom-scroll bg-[#f8fbfe]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            } animate-fade-in`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs shadow-2xs ${
                msg.role === "user"
                  ? "bg-[#0056b3] text-white"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Droplet className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#0056b3] text-white rounded-tr-none font-medium"
                  : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div
                className={`text-[9px] mt-1 font-mono text-right ${
                  msg.role === "user" ? "text-sky-200" : "text-slate-400"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Droplet className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-3.5 py-2.5 border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-1.5 text-slate-500 text-xs font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0056b3]" />
                <span className="font-mono text-[11px]">
                  {lang === "hi"
                    ? "जलमित्र विचार कर रहा है..."
                    : lang === "mr"
                    ? "जलमित्र विश्लेषण करत आहे..."
                    : "JalMitra is thinking..."}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (when only 1 or 2 messages) */}
      {messages.length <= 2 && (
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 shrink-0">
          {t.prompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handlePromptClick(prompt)}
              className="text-[11px] py-1 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0056b3] border border-sky-200 transition font-medium text-left cursor-pointer active:scale-95"
            >
              💬 {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
        {isListening && (
          <div className="flex items-center justify-between px-3 py-1 mb-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-bold animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              <span>{t.listening}</span>
            </div>
            <button
              onClick={() => setIsListening(false)}
              className="text-xs text-rose-600 hover:text-rose-900 underline cursor-pointer"
            >
              Stop
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5"
        >
          <button
            type="button"
            onClick={handleToggleVoice}
            title="Speech Input (Hindi, Marathi, English)"
            className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${
              isListening
                ? "bg-rose-600 text-white animate-bounce shadow-md"
                : "bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-[#0056b3] border border-slate-200"
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t.inputPlaceholder}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2 rounded-xl bg-[#0056b3] hover:bg-sky-800 disabled:opacity-40 text-white transition shadow-xs cursor-pointer shrink-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
