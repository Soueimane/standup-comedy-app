
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface ApplyToEventModalProps {
  isOpen: boolean;
  eventId: string;
  onClose: () => void;
}

const ApplyToEventModal: React.FC<ApplyToEventModalProps> = ({ isOpen, eventId, onClose }) => {
  const { applyToEvent, events } = useData();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const event = events.find(e => e.id === eventId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setIsSubmitting(true);
    
    try {
      applyToEvent(eventId, user.id, message);
      onClose();
      setMessage('');
    } catch (error) {
      console.error('Error applying to event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) return null;

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
            className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 m-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <Heart className="w-6 h-6 text-pink-400" />
                <h2 className="text-xl font-bold text-white">Candidater</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Event Info */}
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">{event.title}</h3>
              <div className="space-y-1 text-sm text-gray-400">
                <p>{event.organizerName}</p>
                {event.organizerEmail && <p>📧 {event.organizerEmail}</p>}
                <p>{new Date(event.date).toLocaleDateString('fr-FR')} à {event.startTime}</p>
                <p>{event.venue}, {event.location.city}</p>
                <p className="text-green-400 font-medium">{event.budget?.max || 0}€ de cachet</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message de motivation
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Présentez-vous et expliquez pourquoi vous souhaitez participer à cet évènement..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/500 caractères
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
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  disabled={isSubmitting || !message.trim()}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Envoi...</span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer ma candidature
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

export default ApplyToEventModal;
