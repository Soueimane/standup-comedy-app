import { type CSSProperties, useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api, { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../services/api';

interface Notification {
  _id: string;
  type: 'new_application' | 'application_accepted' | 'application_rejected' | 'event_updated' | 'absence_marked' | 'event_cancelled';
  title: string;
  message: string;
  relatedEvent?: {
    _id: string;
    title: string;
    date: string;
  };
  relatedApplication?: {
    _id: string;
    status: string;
  };
  relatedUser?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  read: boolean;
  readAt?: string;
  createdAt: string;
}

const NotificationDropdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOrganizer = user?.role === 'ORGANIZER';
  const isComedian = user?.role === 'COMEDIAN';
  const shouldShowNotifications = isOrganizer || isComedian;

  // Récupérer les notifications
  const { data: notificationsData, refetch } = useQuery({
    queryKey: ['notifications', user?._id],
    queryFn: async () => {
      const response = await api.get('/notifications?read=false&limit=10');
      return response.data;
    },
    enabled: !!user && shouldShowNotifications,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  const notifications: Notification[] = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lue
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification._id);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Erreur lors du marquage de la notification:', error);
      }
    }

    // Naviguer vers la page appropriée
    if (notification.relatedEvent?._id) {
      if (notification.type === 'new_application' || notification.relatedApplication) {
        navigate(`/applications?eventId=${notification.relatedEvent._id}`);
      } else {
        navigate(`/events`);
      }
    } else {
      navigate('/applications');
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'new_application':
        return '📝';
      case 'application_accepted':
        return '✅';
      case 'application_rejected':
        return '❌';
      case 'event_updated':
        return '📅';
      case 'absence_marked':
        return '🚫';
      case 'event_cancelled':
        return '🛑';
      default:
        return '🔔';
    }
  };

  if (!shouldShowNotifications) {
    return null;
  }

  const badgeStyle: CSSProperties = {
    position: 'relative',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
  };

  const badgeCountStyle: CSSProperties = {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#dc3545',
    color: '#fff',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.65em',
    fontWeight: 'bold',
    border: '2px solid rgba(0, 0, 0, 0.4)',
  };

  const dropdownStyle: CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    width: '320px',
    maxWidth: '90vw',
    maxHeight: '450px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
  };

  const notificationItemStyle: CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    position: 'relative',
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        style={badgeStyle}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        <span style={{ fontSize: '1.1em' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={badgeCountStyle}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        <div style={dropdownStyle}>
          {/* En-tête */}
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}>
            <h3 style={{ margin: 0, color: '#ff416c', fontSize: '0.95em', fontWeight: 'bold' }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 65, 108, 0.2)',
                  color: '#ff416c',
                  fontSize: '0.75em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Tout lu
              </button>
            )}
          </div>

          {/* Liste des notifications */}
          <div style={{
            overflowY: 'auto',
            maxHeight: '360px',
          }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '30px 16px',
                textAlign: 'center',
                color: '#aaa',
              }}>
                <p style={{ margin: 0, fontSize: '0.9em' }}>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    ...notificationItemStyle,
                    backgroundColor: notification.read ? 'transparent' : 'rgba(255, 65, 108, 0.1)',
                    borderLeft: notification.read ? 'none' : '3px solid #ff416c',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read ? 'transparent' : 'rgba(255, 65, 108, 0.1)';
                  }}
                >
                  <span style={{ fontSize: '1.3em', flexShrink: 0 }}>
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      color: '#fff',
                      fontWeight: notification.read ? 'normal' : 'bold',
                      fontSize: '0.9em',
                      marginBottom: '3px',
                      lineHeight: '1.3',
                    }}>
                      {notification.title}
                    </p>
                    <p style={{
                      margin: 0,
                      color: '#aaa',
                      fontSize: '0.8em',
                      lineHeight: '1.3',
                    }}>
                      {notification.message}
                    </p>
                    <p style={{
                      margin: '3px 0 0 0',
                      color: '#666',
                      fontSize: '0.7em',
                    }}>
                      {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNotification(e, notification._id)}
                    style={{
                      padding: '3px 6px',
                      borderRadius: '3px',
                      border: 'none',
                      background: 'rgba(220, 53, 69, 0.2)',
                      color: '#dc3545',
                      cursor: 'pointer',
                      fontSize: '0.75em',
                      flexShrink: 0,
                      minWidth: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(220, 53, 69, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(220, 53, 69, 0.2)';
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            }}>
              <button
                onClick={() => {
                  if (isOrganizer) {
                    navigate('/applications');
                  } else if (isComedian) {
                    navigate('/applications');
                  }
                  setIsOpen(false);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 65, 108, 0.2)',
                  color: '#ff416c',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {isOrganizer ? 'Voir toutes les candidatures' : 'Voir mes candidatures'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;

