import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResponseMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => Promise<void>;
  action: 'accepted' | 'rejected';
  humoristName: string;
  eventTitle: string;
}

const ResponseMessageModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  action, 
  humoristName, 
  eventTitle 
}: ResponseMessageModalProps) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAccepted = action === 'accepted';
  
  const defaultMessages = {
    accepted: `Bonjour ${humoristName},\n\nJ'ai le plaisir de vous informer que votre candidature pour l'évènement "${eventTitle}" a été acceptée !\n\nNous sommes ravis de vous compter parmi nous. Je reviendrai vers vous prochainement avec les détails pratiques.\n\nÀ bientôt !`,
    rejected: `Bonjour ${humoristName},\n\nMerci pour votre candidature pour l'évènement "${eventTitle}".\n\nMalheureusement, nous ne pourrons pas donner suite à votre candidature cette fois-ci. Nous espérons avoir l'occasion de collaborer avec vous lors d'un prochain évènement.\n\nBonne continuation dans vos projets !`
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onConfirm(message || defaultMessages[action]);
      onClose();
      setMessage('');
    } catch (error) {
      console.error('Error sending response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipMessage = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(''); // Envoie sans message personnalisé
      onClose();
      setMessage('');
    } catch (error) {
      console.error('Error sending response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-700 m-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                {isAccepted ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <h2 className="text-xl font-bold text-white">
                  {isAccepted ? 'Accepter la candidature' : 'Refuser la candidature'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Humorist Info */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                  {humoristName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{humoristName}</h3>
                  <p className="text-gray-400">{eventTitle}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message de réponse
                  <span className="text-gray-500 font-normal ml-2">(optionnel)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={defaultMessages[action]}
                  rows={8}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/1000 caractères
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-400 mb-2">💡 Conseil :</p>
                <p className="text-sm text-gray-300">
                  {isAccepted 
                    ? "Un message personnalisé renforcera votre relation professionnelle et donnera une image positive de votre évènement."
                    : "Un message poli et constructif laisse la porte ouverte à de futures collaborations."
                  }
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipMessage}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Envoi...' : `${isAccepted ? 'Accepter' : 'Refuser'} sans message`}
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 ${isAccepted 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                    : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
                  }`}
                  disabled={isSubmitting || message.length > 1000}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Envoi...</span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {isAccepted ? 'Accepter avec message' : 'Refuser avec message'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ResponseMessageModal; 