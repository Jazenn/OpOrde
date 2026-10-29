// Throwaway, local-only UX review server. No application services or credentials.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The UX prototype is for local review only.');
}
const page = new URL('../public/ux-prototype.html', import.meta.url);
createServer((request, response) => {
  if (new URL(request.url, 'http://localhost').pathname !== '/ux-prototype.html') {
    response.writeHead(404).end('Open /ux-prototype.html');
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(readFileSync(page));
}).listen(4177, '127.0.0.1', () => {
  console.log('Throwaway UX prototype: http://127.0.0.1:4177/ux-prototype.html?variant=A');
});
