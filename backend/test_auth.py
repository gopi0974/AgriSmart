import sys
import os
import traceback

# Ensure the backend directory is on the path when run as a standalone script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import auth  # pyre-ignore[21]
    auth.farmer_signup('A','a@a.com','1','1')
    print("Success")
except Exception as e:
    with open('err.txt', 'w') as f:
        f.write(traceback.format_exc())
