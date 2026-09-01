import http.server
import socketserver
import urllib.request
import urllib.error
import json
import os
import sys

PORT = 5180
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, ApplicationAccessKey, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/proxy-appsheet'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                body = json.loads(post_data.decode('utf-8'))
                app_id = body.get('appId', '')
                table_name = body.get('tableName', '')
                access_key = body.get('accessKey', '')

                import urllib.parse
                url = f"https://api.appsheet.com/api/v2/apps/{app_id}/tables/{urllib.parse.quote(table_name)}/Action"
                req_body = json.dumps({
                    "Action": "Find",
                    "Properties": {
                        "Locale": "en-US",
                        "Timezone": "UTC"
                    },
                    "Rows": []
                }).encode('utf-8')

                req = urllib.request.Request(
                    url,
                    data=req_body,
                    headers={
                        "Content-Type": "application/json",
                        "ApplicationAccessKey": access_key
                    },
                    method="POST"
                )

                with urllib.request.urlopen(req) as response:
                    res_data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(res_data)

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/proxy-sheets-json'):
            from urllib.parse import parse_qs, urlparse
            import re, csv, io
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            sheet_id_or_url = params.get('sheetId', [''])[0] or params.get('url', [''])[0]

            # Handle Google Apps Script Web App URLs (script.google.com)
            if 'script.google.com' in sheet_id_or_url or 'macros/s/' in sheet_id_or_url:
                try:
                    req = urllib.request.Request(sheet_id_or_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req) as response:
                        res_data = response.read()
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.end_headers()
                        self.wfile.write(res_data)
                        return
                except Exception as script_err:
                    print(f"Apps script fetch failed: {script_err}")

            # Extract Sheet ID and GID if full URL passed
            sheet_id_match = re.search(r'/d/([a-zA-Z0-9-_]+)', sheet_id_or_url)
            sheet_id = sheet_id_match.group(1) if sheet_id_match else sheet_id_or_url

            gid_match = re.search(r'gid=(\d+)', sheet_id_or_url)
            gid = gid_match.group(1) if gid_match else '0'

            if not sheet_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing sheetId or url parameter"}).encode('utf-8'))
                return

            rows = []
            
            # Attempt 1: Direct CSV Export stream (fetches ALL rows without limit)
            csv_export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
            try:
                req = urllib.request.Request(csv_export_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    content = response.read().decode('utf-8')
                    reader = csv.DictReader(io.StringIO(content))
                    rows = list(reader)
                    
                    if len(rows) > 0:
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.end_headers()
                        self.wfile.write(json.dumps(rows, indent=2).encode('utf-8'))
                        return
            except Exception as csv_err:
                print(f"CSV export attempt failed, trying gviz: {csv_err}")

            # Attempt 2: gviz JSON endpoint with explicit select * and headers=1
            gviz_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:json&tq=select%20*&headers=1&gid={gid}"
            try:
                req = urllib.request.Request(gviz_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    raw_text = response.read().decode('utf-8')
                    match = re.search(r'google\.visualization\.Query\.setResponse\((.*)\);', raw_text)
                    if not match:
                        raise ValueError("Invalid gviz response format")
                    
                    data = json.loads(match.group(1))
                    cols = [c.get('label', f'Col{i}') or f'Col{i}' for i, c in enumerate(data['table']['cols'])]
                    
                    for r in data['table']['rows']:
                        row_dict = {}
                        cell_values = r.get('c', [])
                        for i, col_name in enumerate(cols):
                            if i < len(cell_values) and cell_values[i]:
                                val = cell_values[i].get('v', '')
                                formatted_val = cell_values[i].get('f', val)
                                
                                if isinstance(val, str) and val.startswith('Date('):
                                    dm = re.match(r'Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)', val)
                                    if dm:
                                        y, m, d = int(dm.group(1)), int(dm.group(2)) + 1, int(dm.group(3))
                                        hh = int(dm.group(4)) if dm.group(4) else 0
                                        mm = int(dm.group(5)) if dm.group(5) else 0
                                        ss = int(dm.group(6)) if dm.group(6) else 0
                                        val = f"{y:04d}-{m:02d}-{d:02d} {hh:02d}:{mm:02d}:{ss:02d}"

                                row_dict[col_name] = formatted_val if (formatted_val != '' and not str(val).startswith('Date(')) else val
                            else:
                                row_dict[col_name] = ''
                        rows.append(row_dict)

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps(rows, indent=2).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

        elif self.path.startswith('/api/proxy-sheets-v4'):
            from urllib.parse import parse_qs, urlparse
            import re
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            sheet_id = params.get('sheetId', [''])[0]
            api_key = params.get('apiKey', [''])[0]
            sheet_range = params.get('range', ['A1:Z10000'])[0]

            if not sheet_id or not api_key:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing sheetId or apiKey parameter"}).encode('utf-8'))
                return

            v4_url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{sheet_range}?key={api_key}"
            try:
                req = urllib.request.Request(v4_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    res_data = json.loads(response.read().decode('utf-8'))
                    values = res_data.get('values', [])
                    if not values:
                        rows = []
                    else:
                        headers = values[0]
                        rows = []
                        for row in values[1:]:
                            row_dict = {}
                            for i, h in enumerate(headers):
                                row_dict[h] = row[i] if i < len(row) else ''
                            rows.append(row_dict)

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps(rows, indent=2).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

        elif self.path.startswith('/api/proxy-sheets'):
            from urllib.parse import parse_qs, urlparse
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            sheet_url = params.get('url', [''])[0]

            if not sheet_url:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Missing url parameter")
                return

            try:
                req = urllib.request.Request(sheet_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    res_data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/csv; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(res_data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            super().do_GET()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    server_started = False
    
    for current_port in [PORT, 5181, 5182, 8080]:
        try:
            with socketserver.TCPServer(("", current_port), CustomHandler) as httpd:
                print(f"\n[Server] Running at: http://localhost:{current_port}")
                print("Press Ctrl+C to stop.\n")
                server_started = True
                httpd.serve_forever()
                break
        except OSError:
            continue
            
    if not server_started:
        print(f"\n[Info] A server instance is already running on http://localhost:{PORT}!")
        print(f"👉 You can open http://localhost:{PORT} directly in your browser.\n")

