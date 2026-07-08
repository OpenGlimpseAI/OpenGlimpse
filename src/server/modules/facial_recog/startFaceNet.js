import { startPythonServer } from './facenetClient.js';

startPythonServer()
  .then(() => {
    console.log('[FaceNet] Server is ready at http://127.0.0.1:8000');
  })
  .catch((err) => {
    console.error('[FaceNet] Failed to start server:', err.message);
    process.exit(1);
  });
