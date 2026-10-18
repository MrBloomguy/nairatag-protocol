import React from 'react';
import { createRoot } from 'react-dom/client';
import CeloTagsLanding from './CeloTagsLanding.jsx';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<CeloTagsLanding />);
}
