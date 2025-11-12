
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import ProfileChoice from './ProfileChoice';

const SignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signup, loading, error, clearError } = useAuth();
  
  const [step, setStep] = useState<'profile' | 'form'>('profile');
  const [userType, setUserType] = useState<'humoriste' | 'organisateur' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    stageName: '',
    companyName: ''
  });

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'humoriste' || type === 'organisateur') {
      setUserType(type);
      setStep('form');
    }
  }, [searchParams]);

  const handleProfileSelect = (type: 'humoriste' | 'organisateur') => {
    setUserType(type);
    setStep('form');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) clearError();
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber
    };
  };

  const passwordValidation = validatePassword(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userType || !passwordValidation.isValid) return;

    try {
      // Transformer city en location pour correspondre à SignupData
      const location = {
        city: formData.city || '',
        postalCode: '', // Sera rempli plus tard
        address: ''
      };
      
      await signup({ 
        ...formData, 
        userType,
        location
      });
      navigate('/dashboard');
    } catch (err) {
      // Erreur gérée dans le context
    }
  };

  if (step === 'profile') {
    return <ProfileChoice onSelect={handleProfileSelect} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Back button */}
      <button 
        onClick={() => setStep('profile')}
        className="absolute top-8 left-8 z-20 flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Retour</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-3xl ${
              userType === 'humoriste' 
                ? 'bg-gradient-to-r from-pink-500 to-red-500' 
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            }`}
          >
            {userType === 'humoriste' ? '🎤' : '🎪'}
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {userType === 'humoriste' ? 'Espace Humoriste' : 'Espace Organisateur'}
          </h1>
          <p className="text-gray-400">
            Crée ton compte et rejoins la communauté
          </p>
        </div>

        {/* Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Noms */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="Prénom"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white placeholder:text-gray-400"
              required
            />
            <Input
              type="text"
              placeholder="Nom"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white placeholder:text-gray-400"
              required
            />
          </div>

          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white placeholder:text-gray-400"
            required
          />

          {/* Mot de passe avec validation */}
          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white placeholder:text-gray-400 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {formData.password && (
              <div className="mt-2 space-y-1 text-xs">
                <div className={`flex items-center space-x-2 ${passwordValidation.minLength ? 'text-green-400' : 'text-gray-400'}`}>
                  <span>{passwordValidation.minLength ? '✅' : '❌'}</span>
                  <span>8 caractères minimum</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation.hasUpper ? 'text-green-400' : 'text-gray-400'}`}>
                  <span>{passwordValidation.hasUpper ? '✅' : '❌'}</span>
                  <span>Une majuscule</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation.hasLower ? 'text-green-400' : 'text-gray-400'}`}>
                  <span>{passwordValidation.hasLower ? '✅' : '❌'}</span>
                  <span>Une minuscule</span>
                </div>
                <div className={`flex items-center space-x-2 ${passwordValidation.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
                  <span>{passwordValidation.hasNumber ? '✅' : '❌'}</span>
                  <span>Un chiffre</span>
                </div>
              </div>
            )}
          </div>

          <Input
            type="tel"
            placeholder="Téléphone (optionnel)"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white placeholder:text-gray-400"
          />

          <Input
            type="text"
            placeholder="Ta ville"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white placeholder:text-gray-400"
            required
          />

          {/* Champs spécifiques selon le type */}
          {userType === 'humoriste' && (
            <Input
              type="text"
              placeholder="Nom de scène (optionnel)"
              value={formData.stageName}
              onChange={(e) => handleInputChange('stageName', e.target.value)}
              className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white placeholder:text-gray-400"
            />
          )}

          {userType === 'organisateur' && (
            <Input
              type="text"
              placeholder="Nom de ta structure (optionnel)"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              className="bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white placeholder:text-gray-400"
            />
          )}

          <Button
            type="submit"
            disabled={loading || !passwordValidation.isValid}
            className={`w-full h-12 text-lg font-semibold transition-all duration-300 ${
              userType === 'humoriste'
                ? 'bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
            } disabled:opacity-50`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Création du compte...</span>
              </div>
            ) : (
              'Créer mon compte 🚀'
            )}
          </Button>
        </motion.form>

        {/* Footer */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
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

export default SignupPage;
