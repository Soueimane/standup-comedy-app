import { type CSSProperties, useState, useMemo } from 'react';
import type { IEvent } from '../types/event';

interface EventCalendarProps {
  events?: IEvent[];
  onEventClick: (event: IEvent) => void;
}

type ViewMode = 'month' | 'week' | 'day';

const EventCalendar = ({ events = [], onEventClick }: EventCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const monthNames = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ];
  const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  // --- Comparer deux dates en local ---
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // --- Pré-calculer les événements par jour pour améliorer les performances ---
  const eventsByDate = useMemo(() => {
    const map: Record<string, IEvent[]> = {};
    events.forEach(ev => {
      const d = new Date(ev.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate[key] || [];
  };

  // --- Gestion des jours ---
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const getWeekDays = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // semaine commençant lundi
    startOfWeek.setDate(date.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const today = new Date();
  const isToday = (date: Date | null) => date ? isSameDay(date, today) : false;

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') newDate.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1));
      if (viewMode === 'week') newDate.setDate(prev.getDate() + (direction === 'prev' ? -7 : 7));
      if (viewMode === 'day') newDate.setDate(prev.getDate() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const monthDays = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const dayDays = [currentDate];
  const days = viewMode === 'month' ? monthDays : viewMode === 'week' ? weekDays : dayDays;

  // --- Styles ---
  const calendarStyle: CSSProperties = { maxWidth:'1200px', margin:'0 auto', padding:'20px' };
  const calendarHeaderStyle: CSSProperties = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', padding:'15px', backgroundColor:'rgba(0,0,0,0.3)', borderRadius:'10px' };
  const monthTitleStyle: CSSProperties = { fontSize:'1.5em', fontWeight:'bold', color:'#ff416c' };
  const navButtonStyle: CSSProperties = { padding:'8px 16px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,65,108,0.2)', color:'#ff416c', fontWeight:'bold', cursor:'pointer', fontSize:'0.9em', transition:'all 0.2s ease' };
  const viewButtonStyle: CSSProperties = { padding:'6px 12px', marginLeft:'6px', borderRadius:'6px', border:'1px solid #ff416c', backgroundColor:'transparent', color:'#ff416c', cursor:'pointer', fontSize:'0.85em', fontWeight:'bold' };
  const calendarGridStyle: CSSProperties = { display:'grid', gridTemplateColumns:`repeat(${viewMode==='month'?7:days.length},1fr)`, gap:'8px', marginBottom:'20px' };
  const dayHeaderStyle: CSSProperties = { padding:'10px', textAlign:'center', fontWeight:'bold', color:'#ff416c', fontSize:'0.9em', backgroundColor:'rgba(0,0,0,0.2)', borderRadius:'6px' };
  const dayCellStyle = (todayFlag:boolean): CSSProperties => ({
    minHeight:'100px', padding:'8px', backgroundColor: todayFlag?'rgba(255,65,108,0.15)':'rgba(0,0,0,0.2)',
    borderRadius:'8px', border: todayFlag?'2px solid #ff416c':'1px solid rgba(255,255,255,0.1)', position:'relative'
  });
  const dayNumberStyle: CSSProperties = { fontSize:'0.9em', fontWeight:'bold', color:'#fff', marginBottom:'4px' };
  const badgeStyle = (type:string): CSSProperties => {
    const colors:Record<string,string> = { published:'#28a745', completed:'#17a2b8', cancelled:'#dc3545', draft:'#6c757d' };
    return { display:'inline-block', minWidth:'18px', padding:'2px 6px', margin:'2px 2px 0 0', fontSize:'0.7em', fontWeight:'bold', color:'#fff', borderRadius:'12px', backgroundColor:colors[type] || '#6c757d', cursor:'pointer' };
  };

  return (
    <div style={calendarStyle}>
      {/* Header */}
      <div style={calendarHeaderStyle}>
        <button onClick={()=>navigate('prev')} style={navButtonStyle}>← Précédent</button>
        <div style={{display:'flex', alignItems:'center'}}>
          <h3 style={monthTitleStyle}>
            {viewMode==='month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode==='week' && `Semaine du ${weekDays[0].getDate()}/${weekDays[0].getMonth()+1} au ${weekDays[6].getDate()}/${weekDays[6].getMonth()+1}`}
            {viewMode==='day' && `${currentDate.getDate()}/${currentDate.getMonth()+1}/${currentDate.getFullYear()}`}
          </h3>
          <button style={viewButtonStyle} onClick={()=>setViewMode('month')}>Mois</button>
          <button style={viewButtonStyle} onClick={()=>setViewMode('week')}>Semaine</button>
          <button style={viewButtonStyle} onClick={()=>setViewMode('day')}>Jour</button>
        </div>
        <button onClick={()=>navigate('next')} style={navButtonStyle}>Suivant →</button>
      </div>

      {/* Grid calendrier */}
      <div style={calendarGridStyle}>
        {viewMode==='month' && dayNames.map(d => <div key={d} style={dayHeaderStyle}>{d}</div>)}
        {days.map((day, idx) => {
          const dayEvents = getEventsForDate(day);
          const todayFlag = isToday(day);
          return (
            <div key={idx} style={dayCellStyle(todayFlag)}>
              {day && <div style={dayNumberStyle}>{day.getDate()}</div>}

              {dayEvents.map((ev,i)=>(
                <span
                  key={i}
                  style={badgeStyle(ev.status||'draft')}
                  title={ev.title}
                  onClick={() => { setSelectedEvent(ev); setIsModalOpen(true); onEventClick(ev); }}
                >
                  {ev.title.length>10?ev.title.slice(0,10)+'…':ev.title}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && selectedEvent && (
        <div
          style={{
            position:'fixed', top:0, left:0, right:0, bottom:0,
            backgroundColor:'rgba(0,0,0,0.5)',
            display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999
          }}
          onClick={()=>{ setIsModalOpen(false); setSelectedEvent(null); }}
        >
          <div
            style={{
              backgroundColor:'#1a1a2e', color:'#fff', padding:'20px', borderRadius:'12px',
              minWidth:'300px', maxWidth:'90%', maxHeight:'80%', overflowY:'auto'
            }}
            onClick={e=>e.stopPropagation()}
          >
            <h3 style={{marginTop:0}}>{selectedEvent.title}</h3>
            <p><strong>Date :</strong> {new Date(selectedEvent.date).toLocaleString()}</p>
            <p><strong>Heure :</strong> {selectedEvent.startTime||'—'} - {selectedEvent.endTime||'—'}</p>
            <p>
              <strong>Organisateur :</strong>{' '}
              {selectedEvent.organizer
                ? selectedEvent.organizer.firstName
                  ? `${selectedEvent.organizer.firstName} ${selectedEvent.organizer.lastName}`
                  : selectedEvent.organizer.companyName || '—'
                : '—'}
            </p>
            {selectedEvent.location && <p><strong>Lieu :</strong> {selectedEvent.location.venue ? selectedEvent.location.venue+', ' : ''}{selectedEvent.location.city}</p>}
            <p><strong>Status :</strong> {selectedEvent.status}</p>
            {selectedEvent.description && <p><strong>Description :</strong> {selectedEvent.description}</p>}
            {selectedEvent.requirements && (
              <p><strong>Exigences :</strong> minExp {selectedEvent.requirements.minExperience}, durée {selectedEvent.requirements.duration} min</p>
            )}
            <button
              onClick={()=>{ setIsModalOpen(false); setSelectedEvent(null); }}
              style={{ marginTop:'10px', padding:'8px 16px', borderRadius:'8px', border:'none', background:'#ff416c', color:'#fff', fontWeight:'bold', cursor:'pointer'}}
            >Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
