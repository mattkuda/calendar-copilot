import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root and local .env files
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Environment variables check:');
console.log('-----------------------------');
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY first 10 chars:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL present:', !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log('GOOGLE_CLIENT_ID present:', !!process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET present:', !!process.env.GOOGLE_CLIENT_SECRET);
console.log('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY present:', !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY); 