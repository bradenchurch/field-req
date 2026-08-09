// Vercel serverless function entry point.
// Vercel's Node.js runtime transpiles this file and routes all traffic here
// via the rewrites in vercel.json. The Express app is default-exported so
// Vercel can use it directly as the request handler (no app.listen needed).
import app from '../src/app';

export default app;
