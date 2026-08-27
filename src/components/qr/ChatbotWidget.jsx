import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { chatWithBot } from '../../services/ai';

export default function ChatbotWidget({ menuItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I am the SmartMenu assistant. Ask me anything about our menu!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    try {
      // Pass a simplified menu context to save tokens
      const menuContext = menuItems.map(i => ({ name: i.name, price: i.price, category: i.category, desc: i.description || '' }));
      const res = await chatWithBot(userText, menuContext);
      setMessages(prev => [...prev, { role: 'bot', text: res.reply || 'Sorry, I had a glitch!' }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I am having trouble connecting to the brain.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 bg-[#6E4A32] text-white p-4 rounded-full shadow-xl hover:bg-[#5C3D28] transition-transform hover:scale-105 z-40"
      >
        <MessageCircle size={28} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 w-80 max-w-[calc(100vw-2rem)] h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-40 overflow-hidden">
      <div className="bg-[#6E4A32] text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} />
          <h3 className="font-bold">SmartMenu Bot</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-[#FAF8F5] space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' ? 'bg-[#6E4A32] text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-500 p-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
              <Loader2 size={16} className="animate-spin" /> typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the menu..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#6E4A32]"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isTyping}
          className="bg-[#6E4A32] text-white p-2 rounded-xl hover:bg-[#5C3D28] disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
