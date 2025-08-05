// Debug script to check progress bar values
// Run this in browser console or add to App.js temporarily

function debugProgressBar() {
  // Get values from localStorage
  const userId = localStorage.getItem('flashcard_userId');
  if (!userId) {
    console.log('❌ No userId found');
    return;
  }

  const storedDate = localStorage.getItem(`flashcard_due_date_${userId}`);
  const storedInitialDue = localStorage.getItem(`flashcard_initial_due_${userId}`);
  const storedInitialTotal = localStorage.getItem(`flashcard_initial_total_${userId}`);
  const storedCompleted = localStorage.getItem(`flashcard_completed_today_${userId}`);
  
  console.log('=== PROGRESS BAR DEBUG ===');
  console.log('User ID:', userId);
  console.log('Stored Date:', storedDate);
  console.log('Today Date:', new Date().toDateString());
  console.log('Stored Initial Due Count:', storedInitialDue);
  console.log('Stored Initial Total Count:', storedInitialTotal);
  console.log('Stored Completed Today:', storedCompleted);
  
  // Check if it's a new day
  const today = new Date().toDateString();
  const isNewDay = storedDate !== today;
  console.log('Is New Day?', isNewDay);
  
  // Try to access React state if available
  if (window.flashcardHook) {
    console.log('Flashcard Hook Available:', Object.keys(window.flashcardHook));
  }
  
  // Check what's in the progress bar display
  const progressText = document.querySelector('.progress-text');
  if (progressText) {
    console.log('Current Progress Display:', progressText.textContent);
  }
  
  console.log('=== END DEBUG ===');
}

// Auto-run
debugProgressBar();

// Make available globally
window.debugProgressBar = debugProgressBar;
