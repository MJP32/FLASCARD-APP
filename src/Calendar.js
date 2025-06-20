import React, { useState, useEffect } from 'react';

const Calendar = ({ calendarDates = [], onClose, isDarkMode = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  
  // Add escape key handler to close calendar
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showModal) {
          // If modal is open, close the modal first
          setShowModal(false);
        } else {
          // If no modal is open, close the entire calendar
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, showModal]);
  
  // Debug logging
  console.log('Calendar component received calendarDates:', calendarDates);

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    // Add empty cells to complete the last week
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        days.push(null);
      }
    }

    return days;
  };

  const formatDateKey = (year, month, day) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDayPress = (day) => {
    if (!day) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateKey = formatDateKey(year, month, day);
    setSelectedDate(dateKey);
    
    const date = new Date(year, month - 1, day);
    const due = getCardsForDay(day);
    console.log('Calendar day pressed:', day, 'due cards found:', due);
    if (due) {
      const modalDataToSet = {
        date: date.toLocaleDateString(),
        value: due.cardCount,
        type: 'cards'
      };
      console.log('Setting modal data:', modalDataToSet);
      setModalData(modalDataToSet);
      setShowModal(true);
    } else {
      console.log('No due cards found for day:', day);
    }
  };

  const getCardsForDay = (day) => {
    if (!day) return null;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const date = new Date(year, month - 1, day);
    
    // More robust date comparison - normalize to same format
    const targetDateString = date.toDateString();
    const found = calendarDates.find(d => {
      if (!d.date) return false;
      const calendarDateString = d.date.toDateString ? d.date.toDateString() : new Date(d.date).toDateString();
      return calendarDateString === targetDateString;
    });
    
    console.log('getCardsForDay - day:', day, 'target date:', targetDateString, 'found:', found);
    return found;
  };

  const getValueColorClass = (type) => {
    switch (type) {
      case 'cards': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth(currentDate);
  const today = new Date();

  // Split days into weeks
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div style={{ 
      width: '480px', 
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', 
      borderRadius: '8px', 
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', 
      border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}` 
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '20px', 
        borderBottom: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
        background: isDarkMode ? 'linear-gradient(to right, rgba(30, 58, 138, 0.3), rgba(67, 56, 202, 0.3))' : 'linear-gradient(to right, #eff6ff, #e0e7ff)',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            style={{
              padding: '8px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '24px',
              fontWeight: 'bold',
              color: isDarkMode ? '#d1d5db' : '#374151'
            }}
            onClick={() => navigateMonth(-1)}
            onMouseOver={(e) => e.target.style.backgroundColor = isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255,255,255,0.5)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ‹
          </button>
          
          <button 
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onClick={onClose}
            onMouseOver={(e) => e.target.style.backgroundColor = isDarkMode ? 'rgba(220, 38, 38, 0.9)' : 'rgba(220, 38, 38, 1)'}
            onMouseOut={(e) => e.target.style.backgroundColor = isDarkMode ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.9)'}
            title="Close Calendar"
          >
            ✕ Close
          </button>
        </div>
        
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: isDarkMode ? '#f9fafb' : '#1f2937', 
          margin: 0,
          letterSpacing: '0.025em'
        }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h1>
        
        <button 
          style={{
            padding: '8px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            fontSize: '24px',
            fontWeight: 'bold',
            color: isDarkMode ? '#d1d5db' : '#374151'
          }}
          onClick={() => navigateMonth(1)}
          onMouseOver={(e) => e.target.style.backgroundColor = isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(255,255,255,0.5)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          ›
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{ padding: '20px' }}>
        {/* Day names header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          marginBottom: '12px',
          borderBottom: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
          paddingBottom: '8px'
        }}>
          {dayNames.map((dayName, index) => (
            <div key={index} style={{ 
              textAlign: 'center', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              padding: '4px 0'
            }}>
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar dates grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '4px'
        }}>
          {days.map((day, index) => {
            const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
            const isToday = date && date.toDateString() === today.toDateString();
            const due = getCardsForDay(day);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const dateKey = day ? formatDateKey(year, month, day) : null;
            const isSelected = selectedDate === dateKey;

            let backgroundColor = isDarkMode ? '#1f2937' : '#ffffff';
            let borderColor = isDarkMode ? '#4b5563' : '#f3f4f6';
            let textColor = isDarkMode ? '#d1d5db' : '#374151';
            let fontWeight = '500';

            if (!day) {
              backgroundColor = isDarkMode ? '#1f2937' : '#f9fafb';
            } else if (isToday) {
              backgroundColor = isDarkMode ? 'rgba(30, 58, 138, 0.4)' : '#dbeafe';
              borderColor = isDarkMode ? '#2563eb' : '#93c5fd';
              textColor = isDarkMode ? '#bfdbfe' : '#1d4ed8';
              fontWeight = '700';
            } else if (isSelected) {
              backgroundColor = isDarkMode ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff';
              borderColor = isDarkMode ? '#3b82f6' : '#bfdbfe';
              textColor = isDarkMode ? '#93c5fd' : '#2563eb';
              fontWeight = '600';
            }

            return (
              <div
                key={index}
                style={{
                  height: '64px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: backgroundColor,
                  cursor: day ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  borderRadius: '4px'
                }}
                onClick={() => handleDayPress(day)}
                onMouseOver={(e) => {
                  if (day && !isToday && !isSelected) {
                    e.target.style.backgroundColor = isDarkMode ? '#374151' : '#f9fafb';
                    e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (day && !isToday && !isSelected) {
                    e.target.style.backgroundColor = backgroundColor;
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {day && (
                  <>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: fontWeight,
                      color: textColor,
                      lineHeight: 1
                    }}>
                      {day}
                    </span>
                    {due && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '50%',
                        transform: 'translateX(-50%)'
                      }}>
                        <div style={{
                          padding: '2px 6px',
                          borderRadius: '9999px',
                          backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: '500',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          {(() => { console.log('Calendar Badge - Day:', day, 'Due:', due, 'Count:', due.cardCount); return due.cardCount; })()}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: '16px',
        borderTop: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
        backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : '#f9fafb',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: isDarkMode ? 'rgba(30, 58, 138, 0.4)' : '#dbeafe',
              border: `2px solid ${isDarkMode ? '#2563eb' : '#93c5fd'}`,
              borderRadius: '2px',
              marginRight: '8px'
            }}></div>
            <span style={{
              fontSize: '14px',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              fontWeight: '500'
            }}>Today</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6',
              borderRadius: '2px',
              marginRight: '8px'
            }}></div>
            <span style={{
              fontSize: '14px',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              fontWeight: '500'
            }}>Cards Due</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && modalData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '384px',
            width: '100%',
            margin: '0 16px',
            border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: isDarkMode ? '#f9fafb' : '#1f2937',
              marginBottom: '16px',
              textAlign: 'center',
              margin: '0 0 16px 0'
            }}>{modalData.date}</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6',
                borderRadius: '50%'
              }}></div>
              <p style={{
                color: isDarkMode ? '#d1d5db' : '#6b7280',
                margin: 0
              }}>
                <span style={{ fontWeight: '600' }}>{(() => { console.log('Calendar Modal - Date:', modalData.date, 'Value:', modalData.value, 'Modal Data:', modalData); return modalData.value; })()}</span> cards due
              </p>
            </div>
            <button
              style={{
                width: '100%',
                backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6',
                color: '#ffffff',
                fontWeight: '500',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              onClick={() => setShowModal(false)}
              onMouseOver={(e) => e.target.style.backgroundColor = isDarkMode ? '#1d4ed8' : '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = isDarkMode ? '#2563eb' : '#3b82f6'}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Demo component with sample data
const CalendarDemo = () => {
  // Sample calendar dates for demonstration
  const today = new Date();
  const sampleCalendarDates = [
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate()), cardCount: 5 }, // Today
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3), cardCount: 3 },
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6), cardCount: 8 },
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10), cardCount: 2 },
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 13), cardCount: 6 },
    { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 16), cardCount: 4 },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Review Schedule Calendar</h1>
        <Calendar calendarDates={sampleCalendarDates} />
      </div>
    </div>
  );
};

export default Calendar;