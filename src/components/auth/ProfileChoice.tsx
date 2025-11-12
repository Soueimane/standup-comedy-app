
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileChoiceProps {
  onSelect: (type: 'humoriste' | 'organisateur') => void;
}

const ProfileChoice: React.FC<ProfileChoiceProps> = ({ onSelect }) => {
  const [selectedType, setSelectedType] = useState<'humoriste' | 'organisateur' | null>(null);

  const handleSelect = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Back button */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 z-20 flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Retour</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full relative z-10"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-black text-white mb-4">
            Choisis ton profil
          </h2>
          <p className="text-gray-400 text-lg">
            Pour une expérience personnalisée
          </p>
        </motion.div>
        
        <div className="space-y-6">
          {/* Humoriste Card */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedType('humoriste')}
            className={`p-8 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
              selectedType === 'humoriste' 
                ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white border-pink-400 shadow-2xl shadow-pink-500/25' 
                : 'bg-gray-800/50 backdrop-blur-sm text-gray-300 hover:bg-gray-700/50 border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-6">
              <div className="text-5xl">🎤</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Je suis humoriste</h3>
                <p className={`text-sm ${selectedType === 'humoriste' ? 'text-white/90' : 'text-gray-400'}`}>
                  Je cherche des dates et veux développer ma carrière dans le stand-up
                </p>
              </div>
              {selectedType === 'humoriste' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-2xl"
                >
                  ✅
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Organisateur Card */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedType('organisateur')}
            className={`p-8 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
              selectedType === 'organisateur' 
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-cyan-400 shadow-2xl shadow-cyan-500/25' 
                : 'bg-gray-800/50 backdrop-blur-sm text-gray-300 hover:bg-gray-700/50 border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-6">
              <div className="text-5xl">🎪</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">J'organise des événements</h3>
                <p className={`text-sm ${selectedType === 'organisateur' ? 'text-white/90' : 'text-gray-400'}`}>
                  Je recherche des humoristes talentueux pour mes événements
                </p>
              </div>
              {selectedType === 'organisateur' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-2xl"
                >
                  ✅
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: selectedType ? 1.05 : 1 }}
          whileTap={{ scale: selectedType ? 0.95 : 1 }}
          disabled={!selectedType}
          onClick={handleSelect}
          className={`w-full mt-12 py-4 px-8 font-bold rounded-full transition-all duration-300 ${
            selectedType
              ? 'bg-white text-black hover:shadow-2xl cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
          }`}
        >
          {selectedType ? 'Continuer 🚀' : 'Sélectionne ton profil'}
        </motion.button>

        {/* Login link */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-gray-400">
            Déjà inscrit ? {' '}
            <Link to="/login" className="text-pink-400 hover:text-pink-300 font-medium transition-colors">
              Connecte-toi
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProfileChoice;
