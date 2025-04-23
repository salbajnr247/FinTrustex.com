// Type definitions for Express 5 compatibility with TypeScript
declare module 'express' {
  import * as http from 'http';
  
  export interface Request {
    path: string;
    method: string;
    params: Record<string, string>;
    query: Record<string, string>;
    body: any;
    headers: Record<string, string>;
    openai?: any; // For OpenAI API instance
    [key: string]: any;
  }
  
  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
    send(body: any): Response;
    sendFile(path: string): void;
    setHeader(name: string, value: string): Response;
    end(): Response;
    [key: string]: any;
  }
  
  export interface NextFunction {
    (err?: any): void;
  }
  
  export interface Express {
    use(...handlers: any[]): Express;
    get(path: string, ...handlers: any[]): Express;
    post(path: string, ...handlers: any[]): Express;
    put(path: string, ...handlers: any[]): Express;
    delete(path: string, ...handlers: any[]): Express;
    [key: string]: any;
  }
  
  export interface Router {
    use(...handlers: any[]): Router;
    get(path: string, ...handlers: any[]): Router;
    post(path: string, ...handlers: any[]): Router;
    put(path: string, ...handlers: any[]): Router;
    delete(path: string, ...handlers: any[]): Router;
    [key: string]: any;
  }
  
  export function Router(): Router;
  export function json(options?: any): (req: Request, res: Response, next: NextFunction) => void;
  export function urlencoded(options?: { extended?: boolean }): (req: Request, res: Response, next: NextFunction) => void;
  export function static(root: string, options?: any): (req: Request, res: Response, next: NextFunction) => void;
  
  export default function express(): Express;
}