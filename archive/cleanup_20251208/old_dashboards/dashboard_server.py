#!/usr/bin/env python3
"""
🔧 Diagnostic Dashboard Server
Serves dashboard with proxy to avoid CORS issues
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qs

class DashboardHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        SimpleHTTPRequestHandler.end_headers(self)
    
    def do_GET(self):
        # Proxy API requests to avoid CORS
        if self.path.startswith('/api/proxy/'):
            self.proxy_request()
        else:
            SimpleHTTPRequestHandler.do_GET(self)
    
    def proxy_request(self):
        """Proxy requests to bot API"""
        try:
            # Extract the actual endpoint
            endpoint = self.path.replace('/api/proxy/', '')
            bot_url = f'http://localhost:3001/{endpoint}'
            
            # Fetch from bot API
            with urllib.request.urlopen(bot_url, timeout=5) as response:
                data = response.read()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
                
        except urllib.error.URLError as e:
            # Return error as JSON
            error_data = json.dumps({
                'error': str(e),
                'status': 'error',
                'message': f'Failed to connect to bot API: {bot_url}'
            }).encode()
            
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(error_data)
        except Exception as e:
            error_data = json.dumps({
                'error': str(e),
                'status': 'error'
            }).encode()
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(error_data)

def run_server(port=8080):
    server_address = ('', port)
    httpd = HTTPServer(server_address, DashboardHandler)
    print(f"🚀 Dashboard Server with API Proxy")
    print(f"📊 Dashboard: http://localhost:{port}/live_test_dashboard.html")
    print(f"🔗 API Proxy: http://localhost:{port}/api/proxy/health")
    print(f"🛑 Press Ctrl+C to stop")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server(8080)
