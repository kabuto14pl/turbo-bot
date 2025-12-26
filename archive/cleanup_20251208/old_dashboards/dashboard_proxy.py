#!/usr/bin/env python3
"""
🚀 Dashboard Proxy Server - Serves HTML + proxies API calls
Rozwiązuje problem CORS łącząc HTML i API na tym samym porcie
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import json
import os

class DashboardProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Jeśli ścieżka zaczyna się od /api, przekieruj do bota na port 3001
        if self.path.startswith('/api/') or self.path == '/health':
            self.proxy_to_bot()
        else:
            # Serwuj pliki statyczne (HTML, CSS, JS)
            super().do_GET()
    
    def proxy_to_bot(self):
        """Przekieruj request do bot API na port 3001"""
        try:
            bot_url = f'http://localhost:3001{self.path}'
            
            # Pobierz dane z bot API
            response = urllib.request.urlopen(bot_url, timeout=2)
            data = response.read()
            
            # Wyślij odpowiedź do przeglądarki
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            
        except Exception as e:
            # Jeśli bot nie odpowiada, wyślij błąd
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_data = json.dumps({
                'error': 'Bot API unavailable',
                'details': str(e)
            }).encode()
            self.wfile.write(error_data)
    
    def log_message(self, format, *args):
        # Uproszczone logowanie
        if '/api/' in args[0] or '/health' in args[0]:
            print(f"🔄 Proxy: {args[0]}")

if __name__ == '__main__':
    PORT = 8080
    os.chdir('/workspaces/turbo-bot')
    
    print("=" * 60)
    print("🚀 Dashboard Proxy Server Starting...")
    print("=" * 60)
    print(f"📊 Dashboard: http://localhost:{PORT}/live_test_dashboard.html")
    print(f"🔗 API Proxy: http://localhost:{PORT}/api/* → http://localhost:3001/api/*")
    print(f"🏥 Health: http://localhost:{PORT}/health → http://localhost:3001/health")
    print("=" * 60)
    print("✅ Server ready! Open PORTS tab and forward port 8080")
    print("🛑 Press Ctrl+C to stop")
    print("=" * 60)
    
    server = HTTPServer(('0.0.0.0', PORT), DashboardProxyHandler)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        server.shutdown()
