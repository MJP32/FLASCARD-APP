import React, { useState, useEffect } from 'react';

const Calendar = ({ calendarDates = [], onClose, isDarkMode = false, isVisible = false }) => {
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
  
  // Debug logging (commented out to reduce console spam)
  // console.log('Calendar component received calendarDates:', calendarDates);

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
    const isPastDay = date < today;
    
    console.log('Calendar day pressed:', day, 'due cards found:', due);
    
    // Show modal for days with cards or completed cards
    if (due) {
      const modalDataToSet = {
        date: date.toLocaleDateString(),
        dueCount: due.cardCount || 0,
        completedCount: due.completedCount || 0,
        type: due.cardCount > 0 ? 'cards' : 'completed',
        isPast: isPastDay
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

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className={`modal-overlay ${isDarkMode ? 'dark' : ''}`}>
      <div className="modal-content" style={{
        width: '480px',
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderRadius: '4px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '3px solid #2563eb',
        overflow: 'hidden'
      }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        background: '#2563eb'
      }}>
        <button
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '2px solid rgba(255,255,255,0.3)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffffff'
          }}
          onClick={() => navigateMonth(-1)}
          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        >
          ← Prev
        </button>

        <h1 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#ffffff',
          margin: 0,
          letterSpacing: '0.025em'
        }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '2px solid rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ffffff'
            }}
            onClick={() => navigateMonth(1)}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          >
            Next →
          </button>

          {/* Close button */}
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '28px',
              cursor: 'pointer',
              padding: '0 8px',
              lineHeight: 1
            }}
            onClick={onClose}
            aria-label="Close calendar"
            title="Close Calendar"
          >
            ×
          </button>
        </div>
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
            let borderColor = isDarkMode ? '#4b5563' : '#e5e7eb';

            // Check if this is a past day with incomplete cards (excluding today)
            const isPastDayWithIncompleteCards = day && date && date < today && !isToday && due && due.cardCount > 0;

            if (!day) {
              backgroundColor = isDarkMode ? '#1f2937' : '#f9fafb';
            } else if (isPastDayWithIncompleteCards) {
              // Light red background for past days with incomplete cards
              backgroundColor = isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2';
              borderColor = isDarkMode ? '#ef4444' : '#fecaca';
            } else if (isSelected) {
              backgroundColor = isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff';
              borderColor = isDarkMode ? '#3b82f6' : '#bfdbfe';
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
                  if (day) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (day) {
                    e.currentTarget.style.backgroundColor = backgroundColor;
                  }
                }}
              >
                {day && (
                  <>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isToday ? '#ffffff' : (isDarkMode ? '#e5e7eb' : '#374151'),
                      lineHeight: 1,
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      backgroundColor: isToday ? '#2563eb' : 'transparent'
                    }}>
                      {day}
                    </span>
                    {/* Show card counts for today */}
                    {isToday && due && (due.cardCount > 0 || due.completedCount > 0) && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '2px',
                        alignItems: 'center'
                      }}>
                        {due.completedCount > 0 && (
                          <div style={{
                            padding: '1px 4px',
                            borderRadius: '4px',
                            backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.8)' : '#16a34a',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {due.completedCount}
                          </div>
                        )}
                        {due.cardCount > 0 && (
                          <div style={{
                            padding: '1px 4px',
                            borderRadius: '4px',
                            backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {due.cardCount}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Show completed/incomplete breakdown for past days */}
                    {due && date && date < today && !isToday && (due.cardCount > 0 || due.completedCount > 0) && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '2px',
                        alignItems: 'center'
                      }}>
                        {due.completedCount > 0 && (
                          <div style={{
                            padding: '1px 4px',
                            borderRadius: '4px',
                            backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.8)' : '#16a34a',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {due.completedCount}
                          </div>
                        )}
                        {due.cardCount > 0 && (
                          <div style={{
                            padding: '1px 4px',
                            borderRadius: '4px',
                            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.8)' : '#dc2626',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {due.cardCount}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Show badge for future days with cards due (excluding today) */}
                    {due && date && date > today && (due.cardCount > 0 || due.completedCount > 0) && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '2px',
                        alignItems: 'center'
                      }}>
                        {due.completedCount > 0 && (
                          <div style={{
                            padding: '1px 4px',
                            borderRadius: '4px',
                            backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.7)' : '#16a34a',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {due.completedCount}
                          </div>
                        )}
                        {due.cardCount > 0 && (
                          <div style={{
                            padding: '1px 4px',
                            borderRadius: '4px',
                            backgroundColor: isDarkMode ? '#6b7280' : '#9ca3af', // Gray for future dates
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>
                            {due.cardCount}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Show smiley face and completed count for days with all cards completed */}
                    {due && due.completedCount > 0 && due.cardCount === 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <div style={{
                          fontSize: '16px',
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                        }}>
                          😊
                        </div>
                        <div style={{
                          padding: '1px 4px',
                          borderRadius: '4px',
                          backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.8)' : '#16a34a',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {due.completedCount}
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
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: '#2563eb',
              borderRadius: '50%',
              marginRight: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '600'
            }}>3</div>
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
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: isDarkMode ? '#2563eb' : '#3b82f6',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '600',
              marginRight: '8px'
            }}>5</div>
            <span style={{
              fontSize: '14px',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              fontWeight: '500'
            }}>Cards Due</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginRight: '8px',
              gap: '1px'
            }}>
              <div style={{
                fontSize: '12px'
              }}>😊</div>
              <div style={{
                padding: '1px 3px',
                borderRadius: '3px',
                backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.8)' : '#16a34a',
                color: '#ffffff',
                fontSize: '8px',
                fontWeight: '600',
                lineHeight: 1
              }}>5</div>
            </div>
            <span style={{
              fontSize: '14px',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              fontWeight: '500'
            }}>All Done</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              gap: '2px',
              alignItems: 'center',
              marginRight: '8px'
            }}>
              <div style={{
                padding: '1px 4px',
                borderRadius: '4px',
                backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.8)' : '#16a34a',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '600'
              }}>3</div>
              <div style={{
                padding: '1px 4px',
                borderRadius: '4px',
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.8)' : '#dc2626',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '600'
              }}>2</div>
            </div>
            <span style={{
              fontSize: '14px',
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              fontWeight: '500'
            }}>Completed/Incomplete</span>
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
              marginBottom: '24px'
            }}>
              {/* Show completion stats if any cards were completed */}
              {modalData.completedCount > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
                  borderRadius: '8px',
                  border: `1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`
                }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <p style={{
                    color: isDarkMode ? '#86efac' : '#16a34a',
                    margin: 0,
                    fontWeight: '600'
                  }}>
                    {modalData.completedCount} card{modalData.completedCount !== 1 ? 's' : ''} completed
                  </p>
                </div>
              )}
              
              {/* Show due cards if any */}
              {modalData.dueCount > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: modalData.isPast 
                    ? (isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)')
                    : (isDarkMode ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.05)'),
                  borderRadius: '8px',
                  border: `1px solid ${modalData.isPast 
                    ? (isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)')
                    : (isDarkMode ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.2)')}`
                }}>
                  <span style={{ fontSize: '20px' }}>{modalData.isPast ? '❌' : '📚'}</span>
                  <p style={{
                    color: modalData.isPast 
                      ? (isDarkMode ? '#fca5a5' : '#dc2626')
                      : (isDarkMode ? '#93c5fd' : '#2563eb'),
                    margin: 0,
                    fontWeight: '600'
                  }}>
                    {modalData.dueCount} card{modalData.dueCount !== 1 ? 's' : ''} {modalData.isPast ? 'not completed' : 'due'}
                  </p>
                </div>
              )}
              
              {/* Show all done message if no cards are due */}
              {modalData.dueCount === 0 && modalData.completedCount > 0 && (
                <div style={{
                  textAlign: 'center',
                  marginTop: '16px'
                }}>
                  <span style={{ fontSize: '32px' }}>🎉</span>
                  <p style={{
                    color: isDarkMode ? '#d1d5db' : '#6b7280',
                    margin: '8px 0 0 0',
                    fontWeight: '600'
                  }}>
                    All caught up! Great job!
                  </p>
                </div>
              )}
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
    </div>
  );
};

export default Calendar;