import React, { useState, useRef, useEffect } from "react";
import useChatbot from "../../hooks/usechatbot";

const Chatbot = () => {
  const { processMessage } = useChatbot();
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);
  const [open, setOpen] = useState(false);

  const bottomRef = useRef(null);

  // Auto-scroll to bottom when chat updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    const botReply = { sender: "bot", text: processMessage(input) };

    setChat((prev) => [...prev, userMsg, botReply]);
    setInput("");
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg 
                   flex items-center justify-center transition-all chatbot-button"
        style={{ zIndex: 9999 }}
      >
        💬
      </button>

      {/* Chat Popup */}
      {open && (
        <div
          className="fixed bottom-24 right-6 w-80 p-4 rounded-xl shadow-2xl 
                     animate-fadeIn chatbot-popup"
          style={{ zIndex: 9999 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">MoneyMind Assistant</h2>

            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ✖
            </button>
          </div>

          {/* Chat window */}
          <div className="h-64 overflow-y-auto mb-2 space-y-2 chat-scroll">
            {chat.map((msg, i) => (
              <p
                key={i}
                className={msg.sender === "user" ? "text-right" : "text-left"}
              >
                <span
                  className={`inline-block px-3 py-2 rounded-lg ${
                    msg.sender === "user"
                      ? "chat-bubble-user"
                      : "chat-bubble-bot"
                  }`}
                >
                  {msg.text}
                </span>
              </p>
            ))}

            {/* Auto-scroll anchor */}
            <div ref={bottomRef}></div>
          </div>

          {/* Input + send */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              className="flex-1 p-2 rounded bg-gray-700 outline-none text-white"
              placeholder="Ask something..."
            />

            <button
              onClick={sendMessage}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
