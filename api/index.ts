import type { Request, Response } from 'express';
import { createApiApp } from '../server/createApp.js';

const app = createApiApp();

export default function handler(req: Request, res: Response) {
  const rawUrl = req.url || '/';
  const [rawPath, rawQuery = ''] = rawUrl.split('?');
  const params = new URLSearchParams(rawQuery);
  const vercelPath = params.get('__vercel_path');

  if (vercelPath !== null) {
    params.delete('__vercel_path');
    const cleanQuery = params.toString();
    const normalizedSubPath = vercelPath.replace(/^\/+/, '');
    if (rawPath === '/api' || rawPath === '/api/' || rawPath === '/api/index' || rawPath === '/api/index.ts') {
      req.url = `/api/${normalizedSubPath}${cleanQuery ? `?${cleanQuery}` : ''}`;
    } else {
      req.url = `${rawPath}${cleanQuery ? `?${cleanQuery}` : ''}`;
    }
  }

  return app(req, res);
}
