import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are an AI eligibility assistant for Parachute, a plasma donation center. Your job is to help potential donors find out if they can donate plasma today.

Be warm, encouraging, and conversational. Use a friendly tone — Parachute's brand is modern and approachable. Keep responses concise (2-4 sentences max per turn). Ask one question at a time.

ELIGIBILITY CRITERIA (FDA-regulated):
- Age: Must be 18-69 years old
- Weight: Must weigh at least 110 lbs
- Health: Must be in good general health; no active infections, cold/flu symptoms
- Hydration: Must be well-hydrated; drink 6-8 glasses of water beforehand
- Diet: Avoid high-fat foods 4 hours before donation; eat a healthy meal beforehand
- Medications: Most are fine. DISQUALIFYING: blood thinners (warfarin/Coumadin, heparin), Accutane/isotretinoin (defer 30 days after last dose), Propecia/finasteride (defer 30 days), some antibiotics (defer 3-7 days after finishing). Aspirin is fine.
- Recent illness: Defer 72 hours after cold/flu symptoms fully resolve
- Tattoos/piercings: If done at a licensed facility, no wait. Unlicensed = 4-month deferral
- Travel: Travel to malaria-risk areas requires 3-year deferral
- Surgery: Minor = defer 8 weeks; Major = defer 6 months
- Blood transfusion: 12-month deferral
- Pregnancy: Cannot donate while pregnant; defer 6 weeks after delivery/miscarriage
- Frequency: Can donate up to twice in 7 days with at least 1 day between donations
- Identification: Must bring valid government-issued photo ID

FIRST-TIME DONOR BONUS: New members earn up to $200 for their first 3 donations.

CONVERSATION FLOW:
1. Warmly greet and briefly explain what you do (first message only)
2. Ask about age and weight first (quickest disqualifiers)
3. Ask about current health/symptoms
4. Ask about medications if relevant
5. Ask about recent tattoos, piercings, travel, or procedures only if needed
6. Give a clear ELIGIBLE or DEFER decision with reasoning
7. If eligible, tell them to book in the app and mention the $200 bonus if first-time
8. If deferred, give a specific timeframe and encourage them to come back

CRITICAL: Always respond with ONLY a valid JSON object, no markdown, no extra text:
{
  "message": "Your conversational response here",
  "status": "screening" | "eligible" | "deferred" | "call_center"
}`;

const INITIAL_MESSAGE = {
  role: "assistant",
  content: JSON.stringify({
    message: "Hi! I'm your Parachute eligibility assistant 👋 I'll help you find out if you're ready to donate plasma today — it only takes a couple of minutes. To start, could you tell me your age and approximate weight?",
    status: "screening"
  })
};

function parseMessage(content) {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { message: content, status: "screening" };
  }
}

function StatusBadge({ status }) {
  const config = {
    screening: { label: "Screening in progress", bg: "#EBF4FF", color: "#1A6BB5", dot: "#378ADD" },
    eligible: { label: "You're eligible!", bg: "#EAF6F0", color: "#0F6E56", dot: "#1D9E75" },
    deferred: { label: "Temporarily deferred", bg: "#FEF3E2", color: "#854F0B", dot: "#EF9F27" },
    call_center: { label: "Contact a center", bg: "#FEF0F0", color: "#A32D2D", dot: "#E24B4A" }
  };
  const c = config[status] || config.screening;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: c.bg, color: c.color,
      padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {c.label}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "12px 16px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#B5C4D8",
          animation: "bounce 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}

export default function ParachuteChat() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("screening");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.role === "assistant"
          ? parseMessage(m.content).message
          : m.content
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages
        })
      });

      const data = await response.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "{}";
      const parsed = parseMessage(raw);
      setCurrentStatus(parsed.status || "screening");
      setMessages(prev => [...prev, { role: "assistant", content: JSON.stringify(parsed) }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: JSON.stringify({ message: "Something went wrong — please try again or call your nearest Parachute center.", status: "call_center" })
      }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const resetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setCurrentStatus("screening");
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const lastParsed = parseMessage(messages[messages.length - 1]?.content || "{}");
  const isDone = ["eligible", "deferred", "call_center"].includes(currentStatus);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F2F0EB; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-enter { animation: fadeUp 0.25s ease forwards; }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D8D5CE; border-radius: 4px; }
      `}</style>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        minHeight: "100vh", background: "#F2F0EB",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "24px 16px"
      }}>

        {/* Header */}
        <div style={{ width: "100%", maxWidth: 560, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "#1B3A5C",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8 2 4 5 4 10c0 6 8 12 8 12s8-6 8-12c0-5-4-8-8-8z" fill="white" fillOpacity="0.9"/>
                  <circle cx="12" cy="10" r="3" fill="#1B3A5C"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#1B3A5C", letterSpacing: "-0.3px" }}>
                  Parachute
                </div>
                <div style={{ fontSize: 11, color: "#7B8A9A", fontWeight: 500 }}>Eligibility Screener</div>
              </div>
            </div>
            <StatusBadge status={currentStatus} />
          </div>
        </div>

        {/* Chat window */}
        <div style={{
          width: "100%", maxWidth: 560,
          background: "white",
          borderRadius: 20,
          border: "1px solid #E8E4DC",
          display: "flex", flexDirection: "column",
          height: "calc(100vh - 180px)", minHeight: 420,
          overflow: "hidden",
          boxShadow: "0 2px 24px rgba(27,58,92,0.06)"
        }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
            {messages.map((msg, i) => {
              const parsed = msg.role === "assistant" ? parseMessage(msg.content) : null;
              const isBot = msg.role === "assistant";
              const text = isBot ? parsed?.message : msg.content;

              return (
                <div key={i} className="msg-enter" style={{
                  display: "flex",
                  flexDirection: isBot ? "row" : "row-reverse",
                  gap: 10,
                  marginBottom: 14,
                  alignItems: "flex-end"
                }}>
                  {isBot && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: "#1B3A5C",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginBottom: 2
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C8 2 4 5 4 10c0 6 8 12 8 12s8-6 8-12c0-5-4-8-8-8z"/>
                      </svg>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "78%",
                    background: isBot ? "#F7F5F1" : "#1B3A5C",
                    color: isBot ? "#1A2A3A" : "white",
                    padding: "11px 14px",
                    borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    fontSize: 14, lineHeight: 1.6,
                    fontWeight: 400
                  }}>
                    {text}
                    {isBot && parsed?.status === "eligible" && (
                      <div style={{
                        marginTop: 12, paddingTop: 10,
                        borderTop: "1px solid #D4E8D8",
                        display: "flex", alignItems: "center", gap: 8
                      }}>
                        <a href="https://www.joinparachute.com/app/" target="_blank" rel="noreferrer" style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: "#1B3A5C", color: "white",
                          padding: "8px 14px", borderRadius: 10,
                          fontSize: 13, fontWeight: 500, textDecoration: "none"
                        }}>
                          Book a donation →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="msg-enter" style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: "#1B3A5C",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C8 2 4 5 4 10c0 6 8 12 8 12s8-6 8-12c0-5-4-8-8-8z"/>
                  </svg>
                </div>
                <div style={{
                  background: "#F7F5F1", borderRadius: "4px 16px 16px 16px",
                  display: "inline-flex"
                }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            borderTop: "1px solid #F0EDE8",
            padding: "12px 16px",
            background: "white"
          }}>
            {isDone ? (
              <button onClick={resetChat} style={{
                width: "100%", padding: "11px",
                background: "#F7F5F1", border: "1px solid #E8E4DC",
                borderRadius: 12, fontSize: 14, color: "#4A6070",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500, transition: "background 0.15s"
              }}
              onMouseOver={e => e.target.style.background = "#EEE9E2"}
              onMouseOut={e => e.target.style.background = "#F7F5F1"}
              >
                Start a new screening
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type your answer..."
                  rows={1}
                  style={{
                    flex: 1, padding: "10px 14px",
                    border: "1px solid #E0DBD2",
                    borderRadius: 12, fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#1A2A3A", background: "#FAFAF8",
                    lineHeight: 1.5, maxHeight: 100,
                    overflowY: "auto"
                  }}
                  onInput={e => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                  }}
                  autoFocus
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 40, height: 40, borderRadius: 12, border: "none",
                    background: input.trim() && !loading ? "#1B3A5C" : "#D8D5CE",
                    cursor: input.trim() && !loading ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background 0.15s"
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            )}
            <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#A0AAB4" }}>
              This is a pre-screening tool only. Final eligibility is determined at the center.
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 12, fontSize: 11, color: "#9A9489", textAlign: "center" }}>
          Powered by Claude AI · Parachute Plasma Donation
        </div>
      </div>
    </>
  );
}
