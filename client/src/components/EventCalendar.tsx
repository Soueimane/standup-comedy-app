import { type CSSProperties, useState, useMemo } from 'react';
import type { IEvent } from '../types/event';

interface EventCalendarProps {
  events: IEvent[];
  onEventClick: (event: IEvent) => void;
}

const EventCalendar = ({ events, onEventClick }: EventCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    // Jours vides avant le premier jour du mois
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDate = (date: Date | null): IEvent[] => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toISOString().split('T')[0] === dateStr;
    });
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const days = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const today = new Date();
  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  const calendarStyle: CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  };

  const calendarHeaderStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '10px',
  };

  const monthTitleStyle: CSSProperties = {
    fontSize: '1.5em',
    fontWeight: 'bold',
    color: '#ff416c',
  };

  const navButtonStyle: CSSProperties = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 65, 108, 0.2)',
    color: '#ff416c',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.9em',
    transition: 'all 0.2s ease',
  };

  const calendarGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    marginBottom: '20px',
  };

  const dayHeaderStyle: CSSProperties = {
    padding: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#ff416c',
    fontSize: '0.9em',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
  };

  const dayCellStyle = (hasEvents: boolean, isToday: boolean): CSSProperties => ({
    minHeight: '100px',
    padding: '8px',
    backgroundColor: isToday ? 'rgba(255, 65, 108, 0.15)' : hasEvents ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    border: isToday ? '2px solid #ff416c' : '1px solid rgba(255, 255, 255, 0.1)',
    cursor: hasEvents ? 'pointer' : 'default',
    position: 'relative',
    transition: 'all 0.2s ease',
  });

  const dayNumberStyle: CSSProperties = {
    fontSize: '0.9em',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '4px',
  };

  const eventDotStyle = (status: string): CSSProperties => {
    const colors: Record<string, string> = {
      published: '#28a745',
      completed: '#17a2b8',
      cancelled: '#dc3545',
      draft: '#6c757d',
    };
    return {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: colors[status?.toLowerCase() || 'draft'],
      display: 'inline-block',
      marginRight: '4px',
    };
  };

  const eventItemStyle: CSSProperties = {
    fontSize: '0.75em',
    color: '#fff',
    marginTop: '4px',
    padding: '2px 4px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={calendarStyle}>
      <div style={calendarHeaderStyle}>
        <button 
          onClick={() => navigateMonth('prev')} 
          style={navButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 65, 108, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 65, 108, 0.2)';
          }}
        >
          ← Précédent
        </button>
        <h3 style={monthTitleStyle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button 
          onClick={() => navigateMonth('next')} 
          style={navButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 65, 108, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 65, 108, 0.2)';
          }}
        >
          Suivant →
        </button>
      </div>
      
      <div style={calendarGridStyle}>
        {dayNames.map(day => (
          <div key={day} style={dayHeaderStyle}>{day}</div>
        ))}
        {days.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const todayFlag = isToday(day);
          
          return (
            <div
              key={index}
              style={dayCellStyle(dayEvents.length > 0, todayFlag)}
              onClick={() => dayEvents.length > 0 && dayEvents[0] && onEventClick(dayEvents[0])}
              onMouseEnter={(e) => {
                if (dayEvents.length > 0) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 65, 108, 0.25)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = todayFlag ? 'rgba(255, 65, 108, 0.15)' : dayEvents.length > 0 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {day && (
                <>
                  <div style={dayNumberStyle}>
                    {day.getDate()}
                    {todayFlag && <span style={{ color: '#ff416c', marginLeft: '4px' }}>●</span>}
                  </div>
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <div key={eventIndex} style={eventItemStyle} title={event.title}>
                      <span style={eventDotStyle(event.status || 'draft')}></span>
                      {event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ ...eventItemStyle, color: '#ff416c', fontWeight: 'bold' }}>
                      +{dayEvents.length - 3} autre(s)
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventCalendar;

