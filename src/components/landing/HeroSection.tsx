
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import FloatingShapes from './FloatingShapes';
import ParticleSystem from './ParticleSystem';

interface HeroSectionProps {
  onHumoristeClick: () => void;
  onOrganisateurClick: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onHumoristeClick, onOrganisateurClick }) => {
  return (
    <section className="min-h-screen bg-gradient-to-br from-pink-500 via-red-500 to-cyan-400 relative overflow-hidden">
      {/* Background animations */}
      <FloatingShapes />
      <ParticleSystem />

      {/* Main content */}
      <div className="relative z-10 pt-20 px-4 flex items-center justify-center min-h-screen">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-8"
          >
            ✨ La plateforme N°1 du stand-up en France
          </motion.div>
          
          {/* Tagline viral */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-tight"
          >
            LA RÉVOLUTION
            <br />
            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
              DU STAND-UP
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Connecte-toi avec les meilleurs humoristes et organisateurs.
            <br />
            <strong className="text-yellow-300">C'est ton moment de briller ✨</strong>
          </motion.p>

          {/* CTA Buttons - Style TikTok */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onHumoristeClick}
              className="group px-8 py-4 bg-white text-black font-bold text-lg rounded-full hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 min-w-[280px]"
            >
              <span className="text-2xl">🎤</span>
              <span>JE SUIS HUMORISTE</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                →
              </motion.div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOrganisateurClick}
              className="group px-8 py-4 bg-black/50 backdrop-blur-sm text-white font-bold text-lg rounded-full border-2 border-white/30 hover:bg-white hover:text-black transition-all duration-300 flex items-center space-x-3 min-w-[280px]"
            >
              <span className="text-2xl">🎪</span>
              <span>J'ORGANISE DES ÉVÉNEMENTS</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                →
              </motion.div>
            </motion.button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex justify-center items-center mt-12 space-x-8 text-white/80"
          >
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/50" />
                ))}
              </div>
              <span className="text-sm font-medium">+2.5K humoristes</span>
            </div>
            <div className="w-px h-8 bg-white/30" />
            <div className="text-sm font-medium">
              ⭐ 4.9/5 (850+ avis)
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
      >
        <div className="flex flex-col items-center text-white/70">
          <span className="text-sm mb-2">Découvre plus</span>
          <ChevronDown className="w-6 h-6" />
        </div>
      </motion.div>
      
    </section>
  );
};

export default HeroSection;
