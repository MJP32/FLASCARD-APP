import { render } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  // Smoke test - app should render without throwing
  render(<App />);
});
