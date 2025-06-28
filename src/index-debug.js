import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import DebugApp from './DebugApp';

console.log('Starting debug app...');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<DebugApp />);

console.log('Debug app rendered');