import os

# Base directory for data files
# On Render, we use /data (mounted via disk). Locally, we use the backend folder.
DATA_DIR = os.getenv("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))

def get_data_path(filename):
    """Returns the absolute path for a data file."""
    # Ensure the directory exists
    if not os.path.exists(DATA_DIR):
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
        except:
            pass
    return os.path.join(DATA_DIR, filename)

USERS_FILE = get_data_path("users.json")
CROPS_FILE = get_data_path("crops.json")
