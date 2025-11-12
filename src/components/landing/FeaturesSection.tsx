
import React from 'react';
import { motion } from 'framer-motion';
import FeatureCard from './FeatureCard';

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: "⚡",
      title: "Matching Instantané",
      description: "Algorithme IA qui connecte les profils compatibles en temps réel. Trouve ta date parfaite en quelques clics !",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: "📊",
      title: "Analytics de Fou",
      description: "Stats complètes comme sur TikTok : vues, engagement, revenus. Optimise ta carrière avec des données précises.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: "🔥",
      title: "Score Viral",
      description: "Système de réputation gamifié qui booste ta visibilité. Plus tu performes, plus tu es mis en avant !",
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: "💰",
      title: "Revenus Maximisés",
      description: "Tarification intelligente et négociation automatique. Gagne plus en travaillant moins sur l'administratif.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: "🚀",
      title: "Carrière Boostée",
      description: "Recommandations personnalisées et opportunités exclusives pour faire décoller ta carrière d'humoriste.",
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      icon: "🤝",
      title: "Communauté Active",
      description: "Rejoins une communauté de passionnés, partage tes expériences et apprends des meilleurs humoristes.",
      gradient: "from-pink-500 to-rose-500"
    }
  ];

  return (
    <section className="py-20 bg-gray-900 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black opacity-50" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
            Pourquoi choisir
            <span className="text-gradient"> Stand Up Connect</span> ?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            La plateforme qui révolutionne le monde du stand-up avec des fonctionnalités
            pensées par et pour les artistes et organisateurs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
              index={index}
            />
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold text-lg rounded-full hover:shadow-2xl transition-all duration-300"
          >
            Rejoins la révolution 🚀
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
