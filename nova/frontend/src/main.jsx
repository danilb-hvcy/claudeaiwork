import React from 'react';
import { createRoot } from 'react-dom/client';
import Portal from './heyvacay_portal.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Portal />
  </React.StrictMode>,
);
