
import React, { useState } from 'react';
import { Copy, ArrowLeft, Wifi, Loader2, Users } from 'lucide-react';

interface OnlineMenuProps {
  peerId: string;
  onConnect: (remoteId: string) => void;
  onBack: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

const OnlineMenu: React.FC<OnlineMenuProps> = ({ peerId, onConnect, onBack, connectionStatus }) => {
  const [remoteIdInput, setRemoteIdInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-300">
        <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors font-bold text-sm">
          <ArrowLeft size={18} className="mr-2" /> VOLVER
        </button>

        <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
          <Wifi className="text-emerald-500" /> ONLINE LOBBY
        </h2>
        <p className="text-slate-400 mb-8 text-sm">Juega contra un amigo P2P (Peer-to-Peer).</p>

        {/* MY ID SECTION */}
        <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tu ID de Conexión</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-900 rounded p-3 font-mono text-sm text-yellow-400 break-all border border-slate-700 flex items-center">
              {peerId || <span className="text-slate-600 animate-pulse">Generando ID...</span>}
            </div>
            <button 
              onClick={handleCopy}
              disabled={!peerId}
              className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded transition-colors"
              title="Copiar ID"
            >
              {copied ? <span className="font-bold text-green-400 text-xs">COPIADO</span> : <Copy size={20} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Comparte este código con tu amigo para que se conecte a ti.</p>
        </div>

        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-slate-700 flex-1"></div>
          <span className="text-slate-500 text-xs font-bold uppercase">O Conecta con</span>
          <div className="h-px bg-slate-700 flex-1"></div>
        </div>

        {/* CONNECT SECTION */}
        <div className="space-y-4">
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">ID de tu Amigo</label>
              <input 
                type="text" 
                value={remoteIdInput}
                onChange={(e) => setRemoteIdInput(e.target.value)}
                placeholder="Pega el ID aquí..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-sm"
              />
           </div>

           <button 
             onClick={() => onConnect(remoteIdInput)}
             disabled={!remoteIdInput || connectionStatus === 'connecting' || !peerId}
             className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
           >
             {connectionStatus === 'connecting' ? <Loader2 className="animate-spin" /> : <Users fill="currentColor" />}
             {connectionStatus === 'connecting' ? 'CONECTANDO...' : 'CONECTAR AHORA'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default OnlineMenu;
