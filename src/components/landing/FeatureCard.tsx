
import React from 'react';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  gradient: string;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, gradient, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ scale: 1.05, rotateY: 5 }}
      className={`p-8 rounded-3xl bg-gradient-to-br ${gradient} text-white relative overflow-hidden group cursor-pointer h-full`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/50" />
      </div>
      
      <div className="relative z-10">
        <motion.div 
          className="text-5xl mb-6"
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {icon}
        </motion.div>
        <h3 className="text-2xl lg:text-3xl font-bold mb-4">{title}</h3>
        <p className="text-white/90 leading-relaxed text-lg">{description}</p>
      </div>
      
      {/* Hover effect */}
      <motion.div 
        className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        whileHover={{ opacity: 1 }}
      />
      
      {/* Animated border */}
      <div className="absolute inset-0 rounded-3xl border-2 border-white/20 group-hover:border-white/40 transition-colors duration-300" />
    </motion.div>
  );
};

export default FeatureCard;
