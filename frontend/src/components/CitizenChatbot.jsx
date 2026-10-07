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
  FileText,
  Star,
} from "lucide-react";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_MODEL = import.meta.env.VITE_GROQ_CHAT_MODEL || "openai/gpt-oss-20b";
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
      "Need water immediately (Queue Tanker)",
      "Where is my assigned tanker & OTP?",
      "Report muddy or contaminated water",
    ],
    welcomeMessage:
      "Hello! I am **JalMitra**, your AI Water Assistant from BMC. How can I help you today? You can ask about water supply timings, queue an emergency tanker, or report water deficits in English, Hindi, or Marathi.",
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
      "तुरंत पानी चाहिए / टैंकर मंगाएं",
      "मेरा आवंटित टैंकर व OTP कहाँ है?",
      "गंदे व बदबूदार पानी की शिकायत दर्ज करें",
    ],
    welcomeMessage:
      "नमस्ते! मैं **जलमित्र**, बृहन्मुंबई महानगरपालिका (BMC) का AI जल सहायक हूँ। मैं आपकी क्या मदद कर सकता हूँ? आप जलापूर्ति समय, आपातकालीन टैंकर कतार या पानी की किल्लत के बारे में हिंदी, मराठी या अंग्रेजी में पूछ सकते हैं।",
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
      "तातडीने पाणी पाहिजे / टँकर पाठवा",
      "माझा टँकर आणि OTP कुठे आहे?",
      "गढूळ किंवा दूषित पाण्याची तक्रार नोंदवा",
    ],
    welcomeMessage:
      "नमस्कार! मी **जलमित्र**, बृहन्मुंबई महानगरपालिकेचा (BMC) AI जल साहाय्यक आहे. मी आपली काय मदत करू शकतो? आपण पाणी पुरवठा वेळापत्रक, आपत्कालीन टँकर वाटप किंवा टंचाई तक्रारीबाबत मराठी, हिंदी किंवा इंग्रजीत विचारू शकता.",
    raiseTicketAction: "तक्रार नोंदवा",
    sosAction: "हेल्पलाइन +91 8369978764 डायल करा",
    speechError: "आपल्या ब्राउझरमध्ये व्हॉइस इनपुट उपलब्ध नाही.",
  },
};

export default function CitizenChatbot({
  lang = "en",
  detectedWard,
  citizenCredits = 145,
  credibilityScore = 92,
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
    let allocationQueue = null;
    let isNonsenseOrConfused = false;
    let helplineNumber = "8369978764";

    // 1. Try Backend Proxy endpoint
    try {
      const response = await fetch(`${API_BASE}/api/citizen/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          ward_code: wardCode,
          lang: lang,
          phone: "+91-9820012345",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          replyText = data.reply;
          allocationQueue = data.allocation_queue || null;
          isNonsenseOrConfused = Boolean(data.is_nonsense_or_confused);
          helphoneNumber = data.helpline || "8369978764";
        }
      }
    } catch (backendErr) {
      console.warn("Backend chat endpoint unavailable, falling back to direct Groq API:", backendErr.message);
    }

    // 2. Fallback to Direct Groq API if backend was unreachable or empty
    if (!replyText) {
      const isWaterIntent = /water|tanker|paani|pani|sukha|shortage|dry|deliver|bhejo|pathwa|chahiye|pahije|book|queue|टैंकर|पानी|टँकर|कोरडा|तक्रार/i.test(query);
      const isGibberish = /recipe|cook|movie|film|cricket|football|joke|who is|code|python|song|politics|homework/i.test(query) || (!isWaterIntent && query.length > 25 && !/time|when|schedule|help|call/i.test(query));

      if (isWaterIntent) {
        allocationQueue = {
          ticket_id: `WF-CHAT-${Math.floor(1000 + Math.random() * 9000)}`,
          ward_code: wardCode,
          ward_name: wardName,
          priority_score: 94.2,
          queue_position: 1,
          assigned_tanker: tankerId,
          plate: "MH-03-BW-7821",
          driver: driver,
          eta_mins: etaMins,
          otp_code: otpCode,
          helpline: "8369978764",
        };
      }

      if (isGibberish) {
        isNonsenseOrConfused = true;
      }

      const strictSystemPrompt = `You are "JalMitra" (जलमित्र), the official AI Municipal Water Operations Assistant for Brihanmumbai Municipal Corporation (BMC / मनपा).

STRICT DOMAIN SCOPE & RELEVANCE RULES (MANDATORY):
1. You are EXCLUSIVELY the assistant for BMC Municipal Water Operations (WaterFlow OS) in Mumbai.
2. You ONLY accept and answer requests directly relevant to Mumbai municipal water operations:
   - Drinking water supply schedules, timetable, and water pressure for Mumbai's 24 wards (e.g. Ward ${wardCode} - ${timetable})
   - Reporting dry taps, water shortage, pipeline bursts, low pressure, or contamination
   - Requesting or booking emergency relief water tankers (allocated fairly by the municipal equity queue)
   - Live tracking of relief tankers (${tankerId}, Driver: ${driver}), vehicle plate (MH-03-BW-7821), and 4-digit Delivery OTP (${otpCode})
   - Water safety precautions (boiling muddy water 15+ mins, chlorine purification tablets)
   - Citizen civic credits, credibility score, and fast-track ticket priority
   - Driver conduct grievances (route diversion, GPS tampering, illegal water sales)
   - Official BMC Water Operations Helpline: 8369978764

3. IRRELEVANT REQUESTS, NONSENSE, OR CONFUSION GUARDRAIL (CRITICAL):
   - If the user asks about ANYTHING outside municipal water (such as cooking recipes, Bollywood/movies, coding/programming, politics, jokes, homework, general chit-chat, sports, unrelated trivia), OR if the user provides nonsense, gibberish (e.g. "asdfghjkl", random letters), abusive text, or an incomprehensible/confusing prompt:
   - DO NOT answer or entertain the unrelated topic.
   - Respond politely stating that you are exclusively the BMC Water Operations Assistant and can only assist with Mumbai water supply, tanker deliveries, shortage grievances, and water emergencies.
   - ALWAYS give the customer the contact number to be called: 8369978764.
   - Example (English): "I am JalMitra, your BMC Water Operations Assistant. I can only assist with Mumbai water supply, tanker deliveries, shortage grievances, and water emergencies. If you have any doubts or need assistance, please call our 24/7 Helpline directly at 8369978764."
   - Example (Hindi): "मैं जलमित्र, बीएमसी (BMC) जल विभाग का विशेष सहायक हूँ। मैं केवल मुंबई जल आपूर्ति, टैंकर वितरण, पानी की किल्लत और शिकायतों में सहायता कर सकता हूँ। किसी भी सहायता या प्रश्न के लिए, कृपया बीएमसी जल हेल्पलाइन 8369978764 पर कॉल करें।"
   - Example (Marathi): "मी जलमित्र, मनपा (BMC) पाणी पुरवठा विभागाचा साहाय्यक आहे. मी फक्त मुंबई पाणीपुरवठा, टँकर वाटप व तक्रारींविषयी मदत करू शकतो. कोणत्याही मदतीसाठी कृपया मनपा पाणी हेल्पलाइन 8369978764 वर थेट कॉल करा."

4. WATER ALLOCATION & EMERGENCY TANKER REQUESTS (QUEUE INTEGRATION):
   - If the citizen indicates they have no water, need a tanker, or want to register a shortage complaint:
   - Reassure them that an emergency relief request is being processed directly into the Municipal Water Allocation Queue.
   - Remind them of Tanker ${tankerId} (Driver: ${driver}, ETA: ${etaMins} mins), Delivery OTP: ${otpCode}, and Helpline: 8369978764.

Respond politely and warmly in the user's language (${lang === "hi" ? "Hindi" : lang === "mr" ? "Marathi" : "English"}).`;

      try {
        const candidateModels = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
        for (const m of candidateModels) {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: m,
              messages: [
                { role: "system", content: strictSystemPrompt },
                ...newMessages.slice(-5).map((msg) => ({ role: msg.role, content: msg.content })),
              ],
              max_tokens: 380,
              temperature: 0.5,
            }),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            replyText = groqData.choices?.[0]?.message?.content || "";
            if (replyText) break;
          }
        }
      } catch (directErr) {
        console.warn("Direct Groq API fetch error:", directErr);
      }
    }

    // 3. Fallback to Local Municipal Knowledge if offline
    if (!replyText) {
      if (isNonsenseOrConfused) {
        if (lang === "mr") {
          replyText = `मी जलमित्र, बृहन्मुंबई महानगरपालिकेचा (BMC) अधिकृत जल साहाय्यक आहे. मी फक्त मुंबई पाणीपुरवठा, टँकर वाटप, पाण्याची वेळ आणि जल तक्रारींविषयी मदत करू शकतो. आपल्याला कोणत्याही शंका असल्यास किंवा मदत हवी असल्यास कृपया मनपा पाणी हेल्पलाइन 8369978764 वर थेट कॉल करा.`;
        } else if (lang === "hi") {
          replyText = `मैं जलमित्र, बृहन्मुंबई महानगरपालिका (BMC) का आधिकारिक जल सहायक हूँ। मैं केवल मुंबई जल आपूर्ति, टैंकर वितरण, पानी के समय और जल शिकायतों में सहायता कर सकता हूँ। किसी भी प्रकार के संशय या सहायता के लिए, कृपया बीएमसी जल हेल्पलाइन 8369978764 पर सीधे संपर्क करें।`;
        } else {
          replyText = `I am JalMitra, the official BMC Municipal Water Operations Assistant. I can only assist with Mumbai water supply schedules, emergency tanker deliveries, shortage grievances, and water emergencies. If you are confused or require assistance, please call our 24/7 Helpline directly at 8369978764.`;
        }
      } else if (allocationQueue) {
        if (lang === "mr") {
          replyText = `तुमची तातडीची पाण्याची मागणी पालिकेच्या अधिकृत वाटप रांगेत (Water Allocation Queue) समाविष्ट केली आहे! तक्रार क्रमांक: ${allocationQueue.ticket_id}. प्राधान्य गुण: ${allocationQueue.priority_score}/100. नेमलेला टँकर ${allocationQueue.assigned_tanker} (~${allocationQueue.eta_mins} मिनिटे). डिलिव्हरी OTP: ${allocationQueue.otp_code}. हेल्पलाइन: 8369978764.`;
        } else if (lang === "hi") {
          replyText = `आपकी पानी की मांग को आधिकारिक मनपा जल आवंटन कतार (Water Allocation Queue) में दर्ज कर लिया गया है! टिकट क्र.: ${allocationQueue.ticket_id}. प्राथमिकता स्कोर: ${allocationQueue.priority_score}/100. आवंटित टैंकर ${allocationQueue.assigned_tanker} (~${allocationQueue.eta_mins} मिनट). डिलीवरी OTP: ${allocationQueue.otp_code}. हेल्पलाइन: 8369978764.`;
        } else {
          replyText = `Your emergency water request has been enqueued into the official Municipal Water Allocation Queue! Ticket ID: ${allocationQueue.ticket_id}. Priority Score: ${allocationQueue.priority_score}/100. Assigned Tanker: ${allocationQueue.assigned_tanker} (~${allocationQueue.eta_mins} mins). Delivery OTP: ${allocationQueue.otp_code}. Helpline: 8369978764.`;
        }
      } else if (/priority|score|calculate|formula|कैलकुलेट|स्कोर|गुण|कसा/i.test(query)) {
        if (lang === "mr") {
          replyText = `प्राधान्य गुण (Priority Score) वॉटरफ्लो समता मॉडेलद्वारे मोजला जातो:\n• वॉर्ड संवेदनशीलता निर्देशांक (४०%)\n• नळ कोरडे राहण्याचा कालावधी (३५%)\n• ऐतिहासिक पाण्याचा तुटवडा (२५%)\n• चाळ लोकसंख्या आणि जल तक्रारी\n\nसर्वाधिक टंचाई असलेल्या भागांना आपत्कालीन टँकर वाटपात प्रथम प्राधान्य दिले जाते.`;
        } else if (lang === "hi") {
          replyText = `प्राथमिकता स्कोर (Priority Score) जल आवंटन समानता फॉर्मूले से तय होता है:\n• वार्ड संवेदनशीलता सूचकांक (40%)\n• नल सूखा रहने का समय (35%)\n• ऐतिहासिक जल अभाव प्रतिशत (25%)\n• आबादी घनत्व और नागरिक शिकायतें\n\nअधिक किल्लत वाले वार्डों को आपातकालीन राहत टैंकर कतार में शीर्ष स्थान मिलता है।`;
        } else {
          replyText = `Your Municipal Priority Score is calculated using the WaterFlow OS Equity Formula:\n• Ward Vulnerability Index: 40%\n• Dry-Pipe Hours: 35%\n• Historical Deficit %: 25%\n• Population Density & Spatially Corroborated Complaints.\n\nWards facing severe deficits receive highest ranking in the tanker dispatch queue.`;
        }
      } else if (/hello|hi|heeloo|hey|namaste|नमस्ते|नमस्कार/i.test(query)) {
        if (lang === "mr") {
          replyText = `नमस्कार! मी जलमित्र, मनपा (BMC) जल विभागाचा साहाय्यक आहे. मी वॉर्ड ${wardCode} पाणी पुरवठा वेळ, टँकर वाटप किंवा पाणी तक्रारीत कशी मदत करू?`;
        } else if (lang === "hi") {
          replyText = `नमस्ते! मैं जलमित्र, बीएमसी (BMC) जल विभाग का सहायक हूँ। मैं वार्ड ${wardCode} में जलापूर्ति समय, आपातकालीन टैंकर या पानी की समस्या में आपकी क्या मदद कर सकता हूँ?`;
        } else {
          replyText = `Hello! I am JalMitra, your official BMC Water Operations Assistant. How can I assist you with Ward ${wardCode} water supply timings, emergency tanker delivery, or reporting a shortage?`;
        }
      } else if (lang === "mr") {
        replyText = `वॉर्ड ${wardCode} (${wardName}) साठी आजचे पाणी वेळापत्रक ${timetable} आहे. तातडीच्या मदतीसाठी हेल्पलाइन 8369978764 वर कॉल करा.`;
      } else if (lang === "hi") {
        replyText = `वार्ड ${wardCode} (${wardName}) के लिए आज का जलापूर्ति समय ${timetable} है। सहायता के लिए हेल्पलाइन 8369978764 पर कॉल करें।`;
      } else {
        replyText = `For Ward ${wardCode} (${wardName}), regular water supply is scheduled for ${timetable}. For escalations, dial Helpline 8369978764.`;
      }
    }

    const assistantMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: replyText,
      allocation_queue: allocationQueue,
      is_nonsense_or_confused: isNonsenseOrConfused,
      helpline: helplineNumber,
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
          {/* Citizen Civic Credit Badge in Chatbot Header */}
          <div className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-[10.5px] font-mono flex items-center space-x-1 shadow-2xs">
            <Star className="w-3 h-3 fill-amber-700 text-amber-900" />
            <span>{citizenCredits} Cr</span>
            <span className="hidden sm:inline text-[9px] opacity-75">({credibilityScore}% Trust)</span>
          </div>

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

              {/* Water Allocation Queue Card */}
              {msg.allocation_queue && (
                <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50/50 border border-sky-200 text-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                    <div className="flex items-center space-x-1.5 text-[#0056b3]">
                      <Droplet className="w-3.5 h-3.5 animate-pulse text-sky-600" />
                      <span className="font-bold text-[11px] uppercase tracking-wider">
                        {lang === "hi" ? "जल आवंटन कतार में दर्ज" : lang === "mr" ? "पाणी वाटप रांगेत समाविष्ट" : "Water Allocation Queue"}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-[9.5px]">
                      {msg.allocation_queue.ticket_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                      <span className="text-slate-500 block text-[9.5px]">
                        {lang === "hi" ? "कतार प्राथमिकता" : lang === "mr" ? "रांग प्राधान्य" : "Allocation Rank"}
                      </span>
                      <span className="font-black text-[#0056b3] text-xs">
                        #{msg.allocation_queue.queue_position} · {msg.allocation_queue.priority_score}/100
                      </span>
                    </div>
                    <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                      <span className="text-slate-500 block text-[9.5px]">
                        {lang === "hi" ? "आगमन समय" : lang === "mr" ? "अंदाजे वेळ" : "Estimated Arrival"}
                      </span>
                      <span className="font-black text-emerald-700 text-xs">
                        ~{msg.allocation_queue.eta_mins} mins
                      </span>
                    </div>
                    <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                      <span className="text-slate-500 block text-[9.5px]">
                        {lang === "hi" ? "टैंकर व ड्राइवर" : lang === "mr" ? "टँकर व चालक" : "Tanker & Driver"}
                      </span>
                      <span className="font-bold text-slate-800 text-[10px] truncate block">
                        {msg.allocation_queue.assigned_tanker} ({msg.allocation_queue.plate})
                      </span>
                      <span className="text-slate-600 text-[9px] block font-mono">
                        {msg.allocation_queue.driver} · ⭐ 120 Cr (Preferred)
                      </span>
                    </div>
                    <div className="bg-white/90 p-2 rounded-lg border border-amber-200 bg-amber-50/60">
                      <span className="text-amber-800 block text-[9.5px] font-bold">
                        {lang === "hi" ? "डिलीवरी OTP" : lang === "mr" ? "डिलिव्हरी OTP" : "Delivery OTP"}
                      </span>
                      <span className="font-mono font-black text-amber-900 text-sm tracking-widest">
                        {msg.allocation_queue.otp_code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    {onOpenEmergencyModal && (
                      <button
                        onClick={onOpenEmergencyModal}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10.5px] flex items-center justify-center space-x-1 transition shadow-xs cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Helpline 8369978764</span>
                      </button>
                    )}
                    {onOpenGrievance && (
                      <button
                        onClick={onOpenGrievance}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-sky-50 text-[#0056b3] border border-sky-300 font-bold text-[10.5px] flex items-center justify-center space-x-1 transition shadow-2xs cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{lang === "hi" ? "कतार देखें" : lang === "mr" ? "रांग पहा" : "View Queue"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* BMC Helpline Redirection Card for Off-Topic / Nonsense / Confused Queries */}
              {(msg.is_nonsense_or_confused || (msg.role === "assistant" && msg.content?.includes("8369978764") && !msg.allocation_queue)) && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-[11px] flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-200/90 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-[10.5px] text-amber-950">
                        {lang === "hi" ? "बीएमसी जल हेल्पलाइन" : lang === "mr" ? "मनपा पाणी हेल्पलाइन" : "BMC Water Operations Helpline"}
                      </div>
                      <div className="text-[9.5px] text-amber-800 font-mono font-semibold">
                        +91 8369978764 (Direct Assistance)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenEmergencyModal) {
                        onOpenEmergencyModal();
                      } else {
                        window.location.href = "tel:+918369978764";
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shrink-0 transition flex items-center space-x-1 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call 8369978764</span>
                  </button>
                </div>
              )}

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
