import express, { Router } from 'express';
import { Request, Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Middleware to check if OpenAI API key is set
const checkOpenAIKey = (req: Request, res: Response, next: Function) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'OpenAI API key not configured',
      status: 'unavailable'
    });
  }
  // Set the OpenAI instance on the request
  req.openai = new OpenAI({ apiKey });
  next();
};

// Check API status
router.get('/status', (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  res.json({
    hasApiKey: !!apiKey,
    status: apiKey ? 'available' : 'unavailable'
  });
});

// Process chat messages
router.post('/chat', checkOpenAIKey, async (req: Request, res: Response) => {
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
      ...messages.slice(-10)  // Only use the last 10 messages for context
    ];
    
    // Call OpenAI API
    const openai = req.openai as OpenAI;
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a stable, widely available model
      messages: apiMessages,
      max_tokens: 500,
      temperature: 0.7,
    });
    
    // Extract and return the response
    const response = completion.choices[0].message.content;
    
    res.json({ response });
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message || 'Unknown error'
    });
  }
});

export default router;