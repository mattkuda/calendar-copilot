import { processCalendarPrompt } from './llm';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
// Test the prompt processing
async function testPromptProcessing() {
    try {
        console.log('====== Testing processCalendarPrompt function ======');

        const testPrompts = [
            "What meetings do I have today?",
            "Schedule a meeting with John at 2pm tomorrow for 30 minutes",
            "What's happening on my calendar next week?"
        ];

        for (const prompt of testPrompts) {
            console.log(`\nTesting prompt: "${prompt}"`);
            try {
                const result = await processCalendarPrompt(prompt);
                console.log('Result:', JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('Error processing prompt:', error);
            }
        }

        console.log('\n====== Test completed ======');
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

// Run the test
testPromptProcessing(); 