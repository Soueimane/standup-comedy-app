
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Search, MessageCircle, Calendar, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { messages, sendMessage, getConversation, getUserById, getEventById } = useData();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  if (!user) return null;

  // Récupérer toutes les conversations de l'utilisateur
  const userMessages = messages.filter(msg => 
    msg.fromId === user.id || msg.toId === user.id
  );

  // Grouper par conversation (avec l'autre utilisateur)
  const conversations = userMessages.reduce((acc, msg) => {
    const otherUserId = msg.fromId === user.id ? msg.toId : msg.fromId;
    
    if (!acc[otherUserId]) {
      acc[otherUserId] = {
        userId: otherUserId,
        lastMessage: msg,
        unreadCount: 0,
        messages: []
      };
    }
    
    if (new Date(msg.timestamp) > new Date(acc[otherUserId].lastMessage.timestamp)) {
      acc[otherUserId].lastMessage = msg;
    }
    
    if (!msg.read && msg.toId === user.id) {
      acc[otherUserId].unreadCount++;
    }
    
    return acc;
  }, {} as Record<string, any>);

  const conversationList = Object.values(conversations).sort((a: any, b: any) => 
    new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
  );

  const selectedUser = selectedConversation ? getUserById(selectedConversation) : null;
  const conversationMessages = selectedConversation ? 
    getConversation(user.id, selectedConversation) : [];

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessage(selectedConversation, newMessage.trim());
    setNewMessage('');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] space-x-4">
      {/* Liste des conversations */}
      <div className="w-1/3 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white mb-2">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        <Card className="flex-1 p-0 bg-gray-800/50 border-gray-700 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {conversationList.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-300 mb-2">
                  Aucune conversation
                </h3>
                <p className="text-gray-500 text-sm">
                  Tes messages avec les organisateurs apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversationList.map((conversation: any, index: number) => {
                  const otherUser = getUserById(conversation.userId);
                  if (!otherUser) return null;

                  return (
                    <motion.div
                      key={conversation.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 cursor-pointer transition-colors border-b border-gray-700 ${
                        selectedConversation === conversation.userId 
                          ? 'bg-pink-500/20' 
                          : 'hover:bg-gray-700/50'
                      }`}
                      onClick={() => setSelectedConversation(conversation.userId)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={otherUser.avatarUrl} />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {otherUser.firstName.charAt(0)}{otherUser.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-white truncate">
                              {otherUser.firstName} {otherUser.lastName}
                            </h4>
                            <span className="text-xs text-gray-400">
                              {formatTime(conversation.lastMessage.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-400 truncate">
                            {conversation.lastMessage.content}
                          </p>
                        </div>
                        
                        {conversation.unreadCount > 0 && (
                          <div className="bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Zone de conversation */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedUser ? (
          <>
            {/* Header de la conversation */}
            <Card className="p-4 bg-gray-800/50 border-gray-700 mb-4">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedUser.avatarUrl} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {selectedUser.userType === 'organisateur' ? 'Organisateur' : 'Humoriste'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Messages */}
            <Card className="flex-1 p-4 bg-gray-800/50 border-gray-700 mb-4 overflow-hidden">
              <div className="h-full overflow-y-auto space-y-4">
                {conversationMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Commencez la conversation...</p>
                  </div>
                ) : (
                  conversationMessages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex ${message.fromId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.fromId === user.id
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-700 text-white'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </Card>

            {/* Zone de saisie */}
            <Card className="p-4 bg-gray-800/50 border-gray-700">
              <div className="flex space-x-3">
                <Textarea
                  placeholder="Tapez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-gray-700 border-gray-600 text-white resize-none"
                  rows={2}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </>
        ) : (
          <Card className="flex-1 flex items-center justify-center bg-gray-800/50 border-gray-700">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                Sélectionnez une conversation
              </h3>
              <p className="text-gray-500">
                Choisissez une conversation pour commencer à échanger
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
