// Type definitions for the project

declare module 'express' {
  export interface Request {}
  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
    sendFile(path: string): void;
    setHeader(name: string, value: string): Response;
    end(): Response;
  }
  export interface NextFunction {
    (err?: any): void;
  }
  export interface Router {
    get(path: string, ...handlers: any[]): Router;
    post(path: string, ...handlers: any[]): Router;
    put(path: string, ...handlers: any[]): Router;
    delete(path: string, ...handlers: any[]): Router;
  }
}

declare module 'ws' {
  import * as http from 'http';
  
  export class WebSocketServer {
    constructor(options: { server: http.Server, path: string });
    on(event: string, listener: (socket: WebSocket) => void): void;
    clients: Set<WebSocket>;
  }
  
  export class WebSocket {
    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;
    
    readyState: number;
    
    on(event: string, listener: (data: any) => void): void;
    send(data: string): void;
    close(): void;
  }
}

// Add module declarations for missing types
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    DATABASE_URL: string;
  }
}