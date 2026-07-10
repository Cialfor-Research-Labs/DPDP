import { motion } from 'framer-motion';
import { Activity, ShieldAlert, CheckCircle, FileText, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: 'Overall Compliance', value: '42%', color: 'text-status-gold', bg: 'bg-status-gold' },
    { label: 'Critical Risks', value: '3', color: 'text-status-red', bg: 'bg-status-red' },
    { label: 'Verified Controls', value: '18', color: 'text-status-green', bg: 'bg-status-green' },
    { label: 'Pending Actions', value: '7', color: 'text-accent-cyan', bg: 'bg-accent-cyan' },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center relative px-6 py-24" id="dashboard">
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-6xl w-full z-10 flex flex-col gap-12"
      >
        <div className="text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Command Center</h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Your real-time DPDPA compliance matrix. AI-generated insights based on your infrastructure interview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glass-panel p-6 rounded-2xl glass-panel-hover group relative overflow-hidden"
            >
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full ${stat.bg} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`}></div>
              <p className="text-sm font-mono text-text-muted mb-2 uppercase tracking-wider">{stat.label}</p>
              <h4 className={`text-4xl font-display font-bold ${stat.color}`}>{stat.value}</h4>
            </motion.div>
          ))}
        </div>

        {/* Action Register */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-2 glass-panel rounded-3xl p-8"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="text-accent-purple" size={20} />
              Gap Remediation Register
            </h3>
            
            <div className="space-y-4">
              {[
                { title: 'Implement Consent Manager', desc: 'Required under Section 6(1) for cross-border data routing.', type: 'Critical', icon: <ShieldAlert size={16} className="text-status-red" /> },
                { title: 'Update Privacy Notice', desc: 'Missing itemized data purposes as per Section 5(1).', type: 'High', icon: <FileText size={16} className="text-status-gold" /> },
                { title: 'Data Deletion Mechanism', desc: 'User rights implementation (Section 11) is currently manual.', type: 'Medium', icon: <CheckCircle size={16} className="text-accent-cyan" /> }
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-border-light hover:border-border-medium transition-colors flex items-start gap-4">
                  <div className="mt-1 p-2 bg-white/5 rounded-lg">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-white text-sm mb-1">{item.title}</h5>
                    <p className="text-text-muted text-xs leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 text-text-secondary uppercase">{item.type}</span>
                    <button className="text-text-muted hover:text-white transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 3D Visualizer Placeholder */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent-purple/5"></div>
            
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              {/* Fake SVG Radial Chart for aesthetic */}
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-purple)" strokeWidth="10" strokeDasharray="283" strokeDashoffset="160" strokeLinecap="round" className="animate-pulse" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="var(--accent-cyan)" strokeWidth="8" strokeDasharray="188" strokeDashoffset="120" strokeLinecap="round" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-display font-bold">42<span className="text-lg text-text-muted">%</span></span>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Score</span>
              </div>
            </div>

            <h3 className="font-bold text-center mb-2">Network Health</h3>
            <p className="text-xs text-center text-text-muted">
              Nodes represent data silos. Red links indicate non-compliant transfer vectors.
            </p>
            
            <button className="mt-6 w-full py-3 bg-white text-black text-sm font-medium rounded-full hover:scale-105 transition-transform">
              Generate Report
            </button>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
