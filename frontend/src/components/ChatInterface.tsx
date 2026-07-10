import { motion } from 'framer-motion';
import { Send, Terminal, Bot } from 'lucide-react';
import { useState } from 'react';

export default function ChatInterface() {
  const [messages] = useState([
    {
      role: 'ai',
      content: 'Initializing DPDPA 2023 Compliance Protocol. Upload your data processing register or describe your architecture to begin the audit.',
      time: '00:00'
    },
    {
      role: 'user',
      content: 'We use AWS Mumbai for storage, but route analytics through a US-based server. User consent is gathered via a standard terms page.',
      time: '00:02'
    },
    {
      role: 'ai',
      content: 'Analyzing cross-border transfer vectors...\n\nCRITICAL FINDING: Section 16(1) restricts transfer of personal data outside India except to notified countries. Routing analytics through US servers without explicit, itemized consent violates Section 6(1).',
      time: '00:05',
      alert: true
    }
  ]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center relative px-6 py-24" id="chat">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Left Context Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="glass-panel p-8 rounded-3xl flex flex-col gap-4 border-l-2 border-l-accent-cyan"
          >
            <div className="flex items-center gap-3 text-accent-cyan mb-2">
              <Terminal size={18} />
              <span className="font-mono text-sm tracking-wider uppercase">Audit Log</span>
            </div>
            <h3 className="font-display text-2xl font-bold">Real-time Analysis</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              The AI Core evaluates your responses against the 44 sections of the DPDPA 2023. As you type, the neural manifold calculates compliance vectors.
            </p>
            
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-text-muted">Data Localization</span>
                <span className="text-status-red">Fail</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-status-red w-1/4"></div>
              </div>
              
              <div className="flex justify-between items-center text-xs font-mono mt-4">
                <span className="text-text-muted">Consent Mechanism</span>
                <span className="text-status-gold">Warning</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-status-gold w-2/4"></div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Chat Interface */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-8 glass-panel rounded-3xl flex flex-col h-[600px] overflow-hidden shadow-2xl shadow-accent-purple/10 border-t-accent-purple/30"
        >
          {/* Header */}
          <div className="h-16 border-b border-border-light flex items-center px-6 bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center">
                <Bot size={16} className="text-accent-purple" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">DPDPA Neural Auditor</div>
                <div className="text-xs text-text-muted flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
                  Processing
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-white text-bg-absolute rounded-br-sm font-medium' 
                    : msg.alert 
                      ? 'bg-status-red/10 border border-status-red/20 text-status-red rounded-bl-sm'
                      : 'glass-panel rounded-bl-sm text-text-secondary'
                }`}>
                  {msg.content.split('\n').map((line, i) => (
                    <span key={i} className="block mb-1 last:mb-0">{line}</span>
                  ))}
                </div>
                <span className="text-[10px] font-mono text-text-muted mt-2 px-1">{msg.time}</span>
              </motion.div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border-light bg-white/[0.01]">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Describe your data architecture..." 
                className="w-full bg-black/40 border border-border-medium rounded-full py-4 pl-6 pr-14 text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent-purple/50 transition-colors"
              />
              <button className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center bg-white text-black rounded-full hover:bg-accent-cyan hover:text-white transition-colors">
                <Send size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
