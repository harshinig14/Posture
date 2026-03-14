import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

const API_URL = 'http://localhost:8000';

const ChatBotView: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Hello! I'm your Posture Assistant. Ask me about stretches, ergonomics, or your posture score!",
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        const userQuery = input;
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userQuery })
            });
            const data = await response.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response || "Sorry, I couldn't process that. Try asking about stretches or ergonomics!",
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm having trouble connecting to the server. Make sure the backend is running!",
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        }

        setIsLoading(false);
    };

    const suggestions = [
        "How am I doing?",
        "Neck stretches",
        "My posture score",
        "Desk setup tips"
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-extrabold text-slate-900">AI Health Assistant</h2>
                <div className="px-4 py-1.5 bg-teal-50 border border-teal-100 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Online</span>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50 flex flex-col overflow-hidden">
                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] px-6 py-4 rounded-3xl ${msg.sender === 'user'
                                    ? 'bg-[#14b8a6] text-white rounded-tr-none shadow-lg shadow-teal-50'
                                    : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
                                    }`}
                            >
                                {msg.sender === 'bot' ? (
                                    <div className="prose prose-sm prose-slate max-w-none
                                        prose-p:my-2 prose-p:leading-relaxed
                                        prose-ul:my-2 prose-li:my-1
                                        prose-strong:text-teal-700 prose-strong:font-bold
                                        prose-headings:text-slate-800 prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-2
                                        prose-em:text-teal-600
                                        [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <span className="text-sm font-medium">{msg.text}</span>
                                )}
                                <div className={`text-[10px] mt-3 opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Action tags */}
                <div className="px-8 pb-4 flex flex-wrap gap-2">
                    {suggestions.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setInput(tag)}
                            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-xs font-bold text-slate-500 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-100 transition-all"
                        >
                            {tag}
                        </button>
                    ))}
                </div>

                {/* Input area */}
                <div className="p-8 pt-4 border-t border-slate-50">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask me anything about your posture..."
                            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 pr-16 text-sm font-medium focus:ring-2 focus:ring-[#14b8a6] transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 p-3 bg-[#14b8a6] text-white rounded-xl shadow-lg shadow-teal-100 hover:bg-[#0d9488] transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatBotView;
