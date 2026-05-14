import json
import os
import uuid

CROPS_FILE = r'c:\Users\GOPI\.gemini\antigravity\scratch\farmer_price\backend\crops.json'

if os.path.exists(CROPS_FILE):
    with open(CROPS_FILE, 'r') as f:
        data = json.load(f)
    
    modified = False
    for item in data:
        if 'id' not in item:
            item['id'] = uuid.uuid4().hex
            modified = True
            
    if modified:
        with open(CROPS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        print("Sanitized crops.json: Added missing IDs")
    else:
        print("All items already have IDs")
else:
    print("crops.json not found")
