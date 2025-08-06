#!/usr/bin/env python3
"""
Simple HTTP server for the SM64 Collision Viewer
"""

import http.server
import socketserver
import webbrowser
import os
from threading import Timer

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def open_browser():
    """Open the web browser after a short delay"""
    webbrowser.open(f'http://localhost:{PORT}/viewer/index.html')

def main():
    """Start the HTTP server and open the web viewer"""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"SM64 Collision Viewer server running at http://localhost:{PORT}")
        print(f"Serving files from: {os.getcwd()}")
        print("Opening modular web viewer in your default browser...")
        print(f"  Direct link: http://localhost:{PORT}/viewer/index.html")
        print("  Press Ctrl+C to stop the server")
        print()
        
        # Open browser after 1 second
        Timer(1.0, open_browser).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")

if __name__ == "__main__":
    main()
