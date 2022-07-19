import React from 'react';
import ReactDOM from 'react-dom';

console.log('[Video Loudness Graph] loading content script app');

const appContainer = document.createElement('div');
document.body.appendChild(appContainer);

const ContentPageApp = () => {
  return <div>Content comes here soon.</div>;
  };

ReactDOM.render(
  <React.StrictMode>
    <ContentPageApp />
  </React.StrictMode>,
  appContainer
);
