import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "agrismart"

def get_db():
    if not MONGODB_URI:
        return None
    client = MongoClient(MONGODB_URI)
    return client[DB_NAME]

def get_collection(name):
    db = get_db()
    if db is None:
        return None
    return db[name]
