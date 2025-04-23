"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const express_1 = require("express");
const openai_1 = require("openai");
const dotenv_1 = require("dotenv");

(0, dotenv_1.config)();

const router = (0, express_1.Router)();

// Middleware to check if OpenAI API key is set
const checkOpenAIKey = (req, res, next) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: 'OpenAI API key not configured',
            status: 'unavailable'
        });
    }
    // Set the OpenAI instance on the request
    req.openai = new openai_1.default({ apiKey });
    next();
};

// Check API status
router.get('/status', (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    res.json({
        hasApiKey: !!apiKey,
        status: apiKey ? 'available' : 'unavailable'
    });
});

// Process chat messages
router.post('/chat', checkOpenAIKey, async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'Invalid request. Messages array is required.'
            });
        }
        
        // Construct the system message
        const systemMessage = {
            role: 'system',
            content: `You are an AI assistant for FinTrustEX, a cryptocurrency trading platform. 
            Your role is to provide helpful, accurate information about cryptocurrency trading, 
            the platform features, and general guidance. If asked about specific account details 
            or actions that would require authentication, politely explain that you cannot access 
            personal account information and suggest contacting an admin. Keep responses concise 
            and focused on cryptocurrency trading concepts, platform features, and general finance 
            information. Current date: ${new Date().toDateString()}.`
        };
        
        // Prepare the messages for the API call
        const apiMessages = [
            systemMessage,
            ...messages.slice(-10) // Only use the last 10 messages for context
        ];
        
        // Call OpenAI API
        const openai = req.openai;
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: apiMessages,
            max_tokens: 500,
            temperature: 0.7,
        });
        
        // Extract and return the response
        const response = completion.choices[0].message.content;
        
        res.json({ response });
    }
    catch (error) {
        console.error('Error calling OpenAI API:', error);
        res.status(500).json({
            error: 'Failed to process request',
            details: error.message || 'Unknown error'
        });
    }
});

exports.default = router;