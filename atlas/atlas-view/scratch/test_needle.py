import httpx
import sseclient
import threading
import json
import requests
import queue
import time

def run():
    # Connect to SSE
    try:
        response = requests.get('http://localhost:8424/mcp', stream=True)
    except Exception as e:
        print(f"Error connecting: {e}")
        return
        
    client = sseclient.SSEClient(response)
    
    post_endpoint = None
    q = queue.Queue()
    
    def listen():
        try:
            for event in client.events():
                if event.event == 'endpoint':
                    q.put(('endpoint', event.data))
                elif event.event == 'message':
                    q.put(('message', json.loads(event.data)))
        except Exception as e:
            pass
                
    t = threading.Thread(target=listen, daemon=True)
    t.start()
    
    # Get endpoint
    ev_type, data = q.get(timeout=5)
    if ev_type == 'endpoint':
        post_endpoint = data
        if post_endpoint.startswith('/'):
            post_endpoint = 'http://localhost:8424' + post_endpoint
    else:
        post_endpoint = data
        
    # Send initialize first
    requests.post(post_endpoint, json={
        "jsonrpc": "2.0",
        "id": 0,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test", "version": "1.0"}
        }
    })
    
    while True:
        ev_type, data = q.get(timeout=5)
        if ev_type == 'message' and data.get('id') == 0:
            break
            
    requests.post(post_endpoint, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "notifications/initialized",
        "params": {}
    })
    
    # Send tools/list
    requests.post(post_endpoint, json={
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    })
    
    # Wait for response
    while True:
        ev_type, data = q.get(timeout=5)
        if ev_type == 'message' and data.get('id') == 2:
            print(json.dumps(data, indent=2))
            break

if __name__ == '__main__':
    run()
