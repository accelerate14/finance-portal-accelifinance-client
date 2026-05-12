import { useState, useRef, useEffect } from "react";

const ASSISTANT_URL = import.meta.env.VITE_UIPATH_ASSISTANT_URL;

export default function UiPathAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div
      data-uipath-assistant
      className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end"
    >
      {/* Chat Window - Always mounted to preserve state, hidden when closed */}
      <div
        className={`mb-3 w-[380px] max-h-[calc(100vh-120px)] h-[550px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "block" : "hidden"
        }`}
        style={{
          animation: isOpen ? "slideUp 0.3s ease-out" : "none",
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">
                Underwriter Assistant
              </h3>
              <p className="text-indigo-200 text-xs">AI-Powered Support</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close assistant"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Iframe - Always mounted to preserve state */}
        <div className="w-full h-[calc(100%-56px)]">
          <iframe
            ref={iframeRef}
            src={ASSISTANT_URL}
            className="w-full h-full border-0"
            title="Underwriter Assistant"
            allow="microphone"
          />
        </div>
      </div>

      {/* Toggle Button */}
      <button
        data-uipath-toggle
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          group relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center
          transition-all duration-300 ease-in-out
          ${
            isOpen
              ? "bg-gray-700 hover:bg-gray-800"
              : "bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 hover:scale-110"
          }
        `}
        title={isOpen ? "Close Assistant" : "Open Underwriter Assistant"}
        style={{
          animation: isOpen ? "none" : "pulse-glow 2s infinite",
        }}
      >
        {isOpen ? (
          /* Close Icon */
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          /* Chat/Assistant Icon with Sparkle */
          <div className="relative">
            {/* Chat bubble base */}
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {/* Sparkle/AI indicator */}
            <div className="absolute -top-1 -right-1 w-3 h-3">
              <svg
                className="w-3 h-3 text-yellow-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
              </svg>
            </div>
          </div>
        )}

        {/* Tooltip on hover */}
        {isHovered && !isOpen && (
          <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            Underwriter Assistant
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
          }
          50% {
            box-shadow: 0 4px 25px rgba(99, 102, 241, 0.6);
          }
        }
      `}</style>
    </div>
  );
}