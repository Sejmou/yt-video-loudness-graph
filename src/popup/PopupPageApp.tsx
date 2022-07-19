import React from 'react';
import ReactDOM from 'react-dom';
import styles from './popup.module.css';
import audioScript from './script';

const Popup = () => {
  return <div>Content comes here soon</div>;
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById('root')
);

audioScript();
