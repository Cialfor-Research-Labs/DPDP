import { motion } from 'framer-motion';
import { Shield, Sparkles, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center relative px-6">
      
      {/* Top Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="absolute top-0 w-full max-w-7xl mx-auto flex justify-between items-center py-6 z-20"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center border border-accent-purple/30">
            <Shield size={16} className="text-accent-purple" />
          </div>
          <span className="font-display font-bold tracking-tight text-white">DPDPA ENGINE</span>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">Features</a>
          <a href="#compliance" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">Compliance</a>
          <button className="glass-panel glass-panel-hover px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2">
            <Sparkles size={14} className="text-accent-cyan" />
            <span>Start Audit</span>
          </button>
        </div>
      </motion.nav>

      {/* Hero Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center text-center z-20 max-w-4xl"
      >
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel mb-8 border-accent-purple/30 bg-accent-purple/5">
          <span className="w-2 h-2 rounded-full bg-accent-purple animate-pulse"></span>
          <span className="text-xs font-mono font-medium tracking-wide text-accent-purple uppercase">Neural Engine v4.0 Active</span>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="font-display text-6xl md:text-8xl font-bold tracking-tighter leading-[1.05] mb-6"
        >
          <span className="text-gradient">Intelligent</span><br />
          Compliance.
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-xl text-text-secondary max-w-2xl mb-12 font-light leading-relaxed"
        >
          An Awwwards-worthy WebGL experience that audits your infrastructure against the 
          <span className="text-white font-medium"> DPDPA 2023</span> using procedural AI analysis.
        </motion.p>

        <motion.div variants={itemVariants} className="flex gap-4">
          <button className="bg-white text-bg-absolute px-8 py-4 rounded-full font-medium tracking-wide hover:scale-105 transition-transform duration-300">
            Initialize Scan
          </button>
          <button className="glass-panel glass-panel-hover px-8 py-4 rounded-full font-medium tracking-wide">
            View Architecture
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 text-text-muted"
      >
        <span className="text-xs font-mono tracking-widest uppercase">Scroll to explore</span>
        <motion.div 
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>

      {/* Glassmorphic decorative blur elements (optional, R3F bloom handles mostly) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
    </div>
  );
}
