import React, { useState } from 'react';

const Calendar = ({ calendarDates = [], onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

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
    if (due) {
      setModalData({
        date: date.toLocaleDateString(),
        value: due.cardCount,
        type: 'cards'
      });
      setShowModal(true);
    }
  };

  const getCardsForDay = (day) => {
    if (!day) return null;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const date = new Date(year, month - 1, day);
    
    return calendarDates.find(d => d.date?.toDateString() === date.toDateString());
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
    <div className="w-[400px] bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <button 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          onClick={() => navigateMonth(-1)}
        >
          <span className="text-xl font-bold text-gray-700">←</span>
        </button>
        
        <h1 className="text-xl font-bold text-gray-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h1>
        
        <button 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          onClick={() => navigateMonth(1)}
        >
          <span className="text-xl font-bold text-gray-700">→</span>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day names */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((dayName, index) => (
            <div key={index} className="text-center text-sm font-medium text-gray-600">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar dates */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
            const isToday = date && date.toDateString() === today.toDateString();
            const due = getCardsForDay(day);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const dateKey = day ? formatDateKey(year, month, day) : null;
            const isSelected = selectedDate === dateKey;

            return (
              <div
                key={index}
                className={`
                  aspect-square p-1 flex flex-col items-center justify-center
                  ${!day ? 'bg-gray-50' : 'hover:bg-gray-50 cursor-pointer'}
                  ${isToday ? 'bg-blue-50' : ''}
                  ${isSelected ? 'bg-blue-100' : ''}
                  rounded-lg transition-colors
                `}
                onClick={() => handleDayPress(day)}
              >
                {day && (
                  <>
                    <span className={`
                      text-sm font-medium
                      ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}
                      ${isSelected && !isToday ? 'text-blue-600 font-bold' : ''}
                    `}>
                      {day}
                    </span>
                    {due && (
                      <div className={`mt-1 px-2 py-0.5 rounded-full text-white text-xs font-medium ${getValueColorClass('cards')}`}>
                        {due.cardCount}
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
      <div className="p-4 border-t border-gray-200">
        <div className="flex justify-center space-x-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-50 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Today</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Due Cards</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{modalData.date}</h2>
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-semibold">Cards Due:</span> {modalData.value}
              </p>
            </div>
            <button
              className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              onClick={() => setShowModal(false)}
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
  const sampleCalendarDates = [
    { date: new Date(2025, 5, 12), cardCount: 5 }, // June 12, 2025 (today)
    { date: new Date(2025, 5, 15), cardCount: 3 },
    { date: new Date(2025, 5, 18), cardCount: 8 },
    { date: new Date(2025, 5, 22), cardCount: 2 },
    { date: new Date(2025, 5, 25), cardCount: 6 },
    { date: new Date(2025, 5, 28), cardCount: 4 },
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

export default CalendarDemo;