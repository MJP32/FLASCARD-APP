console.log('index-minimal.js loaded');

// Absolute minimal React app
const root = document.getElementById('root');
if (root) {
  root.innerHTML = '<h1>If you see this, the build system works!</h1>';
  console.log('Root element found and updated');
} else {
  console.error('Root element not found!');
}

// Try to import React
try {
  const React = require('react');
  const ReactDOM = require('react-dom/client');
  console.log('React imported successfully');
  
  const App = () => React.createElement('h1', null, 'React is working!');
  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(React.createElement(App));
  
} catch (error) {
  console.error('React import failed:', error);
  root.innerHTML += '<p style="color: red;">React failed: ' + error.message + '</p>';
}