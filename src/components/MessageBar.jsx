import React from 'react';

/**
 * Message bar for displaying success and error messages
 */
const MessageBar = ({ message, error, flashcardsError, settingsError, onClearError }) => {
  const hasMessages = message || error || flashcardsError || settingsError;

  if (!hasMessages) return null;

  return (
    <div className="message-bar">
      {message && (
        <div className="success-message">
          {message}
        </div>
      )}
      {(error || flashcardsError || settingsError) && (
        <div className="error-message">
          {error || flashcardsError || settingsError}
          <button className="close-message" onClick={onClearError}>×</button>
        </div>
      )}
    </div>
  );
};

export default MessageBar;
