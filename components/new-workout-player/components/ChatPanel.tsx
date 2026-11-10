"use client";
import React, { useEffect, useRef } from "react";
import { Send } from "lucide-react";

interface Message {
  id: string;
  from: "bot" | "user";
  text: string;
}

interface ChatPanelProps {
  messages: Message[];
  messageInput: string;
  setMessageInput: (value: string) => void;
  sendMessage: () => void;
}

export default function ChatPanel({
  messages,
  messageInput,
  setMessageInput,
  sendMessage,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <aside className="col-span-3 flex flex-col h-full border-l border-gray-200 bg-white rounded-r-2xl rounded-l-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center text-white px-4 py-3"
        style={{ backgroundColor: "#036FE3" }}
      >
        <svg
          width="48"
          height="49"
          viewBox="0 0 48 49"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0.62207 24.4407C0.62207 11.3946 11.198 0.818726 24.244 0.818726C37.2901 0.818726 47.866 11.3946 47.866 24.4407C47.866 37.4867 37.2901 48.0626 24.244 48.0626C11.198 48.0626 0.62207 37.4867 0.62207 24.4407Z"
            fill="white"
            fillOpacity="0.2"
          />
          <path
            d="M23.2758 15.3995C23.3179 15.1737 23.4377 14.9698 23.6144 14.823C23.7911 14.6763 24.0136 14.5959 24.2433 14.5959C24.473 14.5959 24.6954 14.6763 24.8721 14.823C25.0488 14.9698 25.1686 15.1737 25.2108 15.3995L26.2452 20.8699C26.3187 21.2589 26.5077 21.6166 26.7876 21.8965C27.0675 22.1764 27.4252 22.3654 27.8141 22.4388L33.2846 23.4733C33.5104 23.5154 33.7143 23.6353 33.861 23.8119C34.0078 23.9886 34.0881 24.2111 34.0881 24.4408C34.0881 24.6705 34.0078 24.8929 33.861 25.0696C33.7143 25.2463 33.5104 25.3661 33.2846 25.4083L27.8141 26.4427C27.4252 26.5162 27.0675 26.7052 26.7876 26.9851C26.5077 27.265 26.3187 27.6227 26.2452 28.0116L25.2108 33.4821C25.1686 33.7079 25.0488 33.9118 24.8721 34.0585C24.6954 34.2053 24.473 34.2856 24.2433 34.2856C24.0136 34.2856 23.7911 34.2053 23.6144 34.0585C23.4377 33.9118 23.3179 33.7079 23.2758 33.4821L22.2413 28.0116C22.1678 27.6227 21.9788 27.265 21.699 26.9851C21.4191 26.7052 21.0613 26.5162 20.6724 26.4427L15.202 25.4083C14.9762 25.3661 14.7723 25.2463 14.6255 25.0696C14.4788 24.8929 14.3984 24.6705 14.3984 24.4408C14.3984 24.2111 14.4788 23.9886 14.6255 23.8119C14.7723 23.6353 14.9762 23.5154 15.202 23.4733L20.6724 22.4388C21.0613 22.3654 21.4191 22.1764 21.699 21.8965C21.9788 21.6166 22.1678 21.2589 22.2413 20.8699L23.2758 15.3995Z"
            stroke="white"
            strokeWidth="1.9685"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="ml-2">
          <div className="text-sm font-semibold">AI Coach</div>
          <div className="text-xs opacity-80">Ready to assist</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col-reverse gap-3 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50">
        <div ref={messagesEndRef}></div>
        {[...messages].reverse().map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2 ${
              m.from === "bot" ? "self-start" : "self-end flex-row-reverse"
            }`}
          >
            {/* Avatar for bot only */}
            {m.from === "bot" && (
              <div className="flex-shrink-0 w-6 h-6 mt-1">
                <svg
                  width="23"
                  height="24"
                  viewBox="0 0 23 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 11.6194C0 5.26811 5.14873 0.119385 11.5 0.119385C17.8513 0.119385 23 5.26811 23 11.6194C23 17.9707 17.8513 23.1194 11.5 23.1194C5.14873 23.1194 0 17.9707 0 11.6194Z"
                    fill="#036FE3"
                    fillOpacity="0.2"
                  />
                  <path
                    d="M11.0288 7.21788C11.0494 7.10796 11.1077 7.00868 11.1937 6.93724C11.2797 6.8658 11.388 6.82669 11.4998 6.82669C11.6117 6.82669 11.72 6.8658 11.806 6.93724C11.892 7.00868 11.9503 7.10796 11.9709 7.21788L12.4745 9.88109C12.5102 10.0704 12.6023 10.2446 12.7385 10.3808C12.8748 10.5171 13.0489 10.6091 13.2383 10.6449L15.9015 11.1485C16.0114 11.169 16.1107 11.2273 16.1821 11.3134C16.2536 11.3994 16.2927 11.5077 16.2927 11.6195C16.2927 11.7313 16.2536 11.8396 16.1821 11.9256C16.1107 12.0117 16.0114 12.07 15.9015 12.0905L13.2383 12.5941C13.0489 12.6299 12.8748 12.7219 12.7385 12.8582C12.6023 12.9944 12.5102 13.1686 12.4745 13.3579L11.9709 16.0211C11.9503 16.131 11.892 16.2303 11.806 16.3018C11.72 16.3732 11.6117 16.4123 11.4998 16.4123C11.388 16.4123 11.2797 16.3732 11.1937 16.3018C11.1077 16.2303 11.0494 16.131 11.0288 16.0211L10.5252 13.3579C10.4895 13.1686 10.3974 12.9944 10.2612 12.8582C10.1249 12.7219 9.95077 12.6299 9.76143 12.5941L7.09822 12.0905C6.9883 12.07 6.88902 12.0117 6.81758 11.9256C6.74614 11.8396 6.70703 11.7313 6.70703 11.6195C6.70703 11.5077 6.74614 11.3994 6.81758 11.3134C6.88902 11.2273 6.9883 11.169 7.09822 11.1485L9.76143 10.6449C9.95077 10.6091 10.1249 10.5171 10.2612 10.3808C10.3974 10.2446 10.4895 10.0704 10.5252 9.88109L11.0288 7.21788Z"
                    stroke="#036FE3"
                    strokeWidth="0.958333"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15.333 6.82785V8.74452"
                    stroke="#036FE3"
                    strokeWidth="0.958333"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16.2917 7.78612H14.375"
                    stroke="#036FE3"
                    strokeWidth="0.958333"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.66634 16.4111C8.19561 16.4111 8.62467 15.9821 8.62467 15.4528C8.62467 14.9235 8.19561 14.4945 7.66634 14.4945C7.13707 14.4945 6.70801 14.9235 6.70801 15.4528C6.70801 15.9821 7.13707 16.4111 7.66634 16.4111Z"
                    stroke="#036FE3"
                    strokeWidth="0.958333"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            {/* Message bubble */}
            <div
  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
    m.from === "bot"
      ? "text-gray-800"
      : "bg-blue-600 text-white"
  }`}
  style={{
    backgroundColor: m.from === "bot" ? "#ECF3FF" : undefined,
  }}
>
  {m.text}
  <div
    className={`text-[10px] mt-1 ${
      m.from === "bot" ? "text-gray-400" : "text-blue-100"
    }`}
  >
    10:24
  </div>
</div>

          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 px-3 py-2 bg-white">
        <div className="relative">
          <input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask me anything..."
            className="w-full border border-gray-300 rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
