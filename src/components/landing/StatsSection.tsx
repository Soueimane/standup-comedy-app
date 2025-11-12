
import React from 'react';
import { motion } from 'framer-motion';

const StatsSection: React.FC = () => {
  const stats = [
    { number: "2.5K+", label: "Humoristes actifs", icon: "🎤" },
    { number: "850+", label: "Événements organisés", icon: "🎪" },
    { number: "96%", label: "Taux de satisfaction", icon: "⭐" },
    { number: "€45K", label: "Revenus générés/mois", icon: "💰" }
  ];

  return (
    <section className="py-20 bg-black text-white relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Les chiffres qui parlent
          </h2>
          <p className="text-gray-400 text-lg">
            Une communauté qui grandit chaque jour
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
              className="text-center group"
            >
              <motion.div 
                className="text-4xl mb-4"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut"
                }}
              >
                {stat.icon}
              </motion.div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                {stat.number}
              </div>
              <div className="text-gray-400 font-medium text-sm md:text-base">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
        >
          <div className="p-6 bg-gray-800/50 rounded-2xl backdrop-blur-sm">
            <div className="text-2xl font-bold text-pink-400 mb-2">Temps moyen</div>
            <div className="text-lg text-gray-300">de matching : 2 minutes</div>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-2xl backdrop-blur-sm">
            <div className="text-2xl font-bold text-cyan-400 mb-2">Augmentation</div>
            <div className="text-lg text-gray-300">de revenus : +40%</div>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-2xl backdrop-blur-sm">
            <div className="text-2xl font-bold text-yellow-400 mb-2">Note moyenne</div>
            <div className="text-lg text-gray-300">des événements : 4.8/5</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
