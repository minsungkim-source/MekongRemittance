#!/usr/bin/env python3
"""Static server for local preview of dist/."""
import functools, http.server, os, socketserver
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 8722), Handler) as s:
    print("serving", ROOT, "on 8722", flush=True)
    s.serve_forever()
