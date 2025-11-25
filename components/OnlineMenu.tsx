

import React, { useState, useRef, useEffect } from 'react';
import { Copy, ArrowLeft, Wifi, Loader2, Users, Send, MessageSquare, Play } from 'lucide-react';
import { Language, ChatEntry } from '../types';
import { translations } from '../services/translations';

interface OnlineMenuProps {
  peerId: string;
  onConnect: (remoteId: string) => void;
  onBack: () => void;
  onStartGame: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  language: Language;
  chatMessages: ChatEntry[];
  onSendMessage: (text: string) => void;
}

const OnlineMenu: React.FC<OnlineMenuProps> = ({ 
    peerId, onConnect, onBack, connectionStatus, onStartGame, 
    language, chatMessages, onSendMessage 
}) => {
  const [remoteIdInput, setRemoteIdInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const t = translations[language];
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCopy = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (chatInput.trim()) {
          onSendMessage(chatInput.trim());
          setChatInput('');
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-300 flex overflow-hidden flex-col md:flex-row h-[600px]">
        
        {/* LEFT PANEL: CONNECTION */}
        <div className="flex-1 p-8 flex flex-col border-r border-slate-700 bg-slate-800/50">
            <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors font-bold text-sm w-fit">
            <ArrowLeft size={18} className="mr-2" /> {t.back}
            </button>

            <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <Wifi className="text-emerald-500" /> ONLINE LOBBY
            </h2>
            <p className="text-slate-400 mb-8 text-sm">{t.onlineDesc}</p>

            {/* MY ID SECTION */}
            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{t.yourId}</label>
            <div className="flex gap-2">
                <div className="flex-1 bg-slate-900 rounded p-3 font-mono text-sm text-yellow-400 break-all border border-slate-700 flex items-center">
                {peerId || <span className="text-slate-600 animate-pulse">Generando ID...</span>}
                </div>
                <button 
                onClick={handleCopy}
                disabled={!peerId}
                className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded transition-colors"
                title={t.copy}
                >
                {copied ? <span className="font-bold text-green-400 text-xs">{t.copied}</span> : <Copy size={20} />}
                </button>
            </div>
            </div>

            {connectionStatus !== 'connected' ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 my-6">
                        <div className="h-px bg-slate-700 flex-1"></div>
                        <span className="text-slate-500 text-xs font-bold uppercase">OR</span>
                        <div className="h-px bg-slate-700 flex-1"></div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{t.friendId}</label>
                        <input 
                            type="text" 
                            value={remoteIdInput}
                            onChange={(e) => setRemoteIdInput(e.target.value)}
                            placeholder="..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm"
                        />
                    </div>
                    <button 
                        onClick={() => onConnect(remoteIdInput)}
                        disabled={!remoteIdInput || connectionStatus === 'connecting' || !peerId}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
                    >
                        {connectionStatus === 'connecting' ? <Loader2 className="animate-spin" /> : <Users fill="currentColor" />}
                        {connectionStatus === 'connecting' ? t.connecting : t.connect}
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-center items-center space-y-4 animate-in fade-in">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                        <Wifi className="text-emerald-500" size={32} />
                    </div>
                    <p className="text-emerald-400 font-bold">CONNECTED</p>
                    <button 
                        onClick={onStartGame}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
                    >
                        <Play fill="currentColor" /> {t.play}
                    </button>
                </div>
            )}
        </div>

        {/* RIGHT PANEL: CHAT */}
        <div className="flex-1 bg-slate-950 flex flex-col border-l border-slate-700">
             <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
                 <MessageSquare size={16} className="text-slate-400" />
                 <span className="font-bold text-sm text-slate-300">{t.chat}</span>
                 {connectionStatus === 'connected' && <div className="ml-auto w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>}
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {chatMessages.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm">
                         <MessageSquare size={32} className="mb-2 opacity-20" />
                         <p className="opacity-50">No messages yet.</p>
                     </div>
                 ) : (
                     chatMessages.map(msg => (
                         <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}`}>
                             {msg.sender === 'system' ? (
                                 <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{t[msg.text as keyof typeof t] || msg.text}</span>
                             ) : (
                                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.sender === 'me' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                                    {msg.text}
                                </div>
                             )}
                             {msg.sender !== 'system' && <span className="text-[10px] text-slate-600 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                         </div>
                     ))
                 )}
                 <div ref={chatEndRef} />
             </div>

             <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                 <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={connectionStatus === 'connected' ? t.typeMessage : "Wait for connection..."}
                    disabled={connectionStatus !== 'connected'}
                    className="flex-1 bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                 />
                 <button 
                    type="submit" 
                    disabled={!chatInput.trim() || connectionStatus !== 'connected'}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                     <Send size={16} />
                 </button>
             </form>
        </div>
      </div>
    </div>
  );
};

export default OnlineMenu;
