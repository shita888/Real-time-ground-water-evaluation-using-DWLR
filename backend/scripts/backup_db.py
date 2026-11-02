"""
Database backup utility for JalDrishti MongoDB collections.
Exports collections to JSON files in backend/data/db_backup/<timestamp>/
before any import or migration is performed.
"""

import os
import sys
import json
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import json_util

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(ENV_PATH)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "dwlr")
BACKUP_BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "db_backup")


def backup_database():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(BACKUP_BASE, f"backup_{timestamp}")
    os.makedirs(backup_dir, exist_ok=True)

    print(f"📦 Starting MongoDB backup to: {backup_dir}")
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[MONGODB_DB]

    collections = db.list_collection_names()
    print(f"📋 Collections to back up: {collections}")

    summary = {}
    for col_name in collections:
        col = db[col_name]
        count = col.count_documents({})
        file_path = os.path.join(backup_dir, f"{col_name}.json")
        print(f"   • Exporting {count} documents from '{col_name}'...")
        cursor = col.find({})
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("[\n")
            first = True
            for doc in cursor:
                if not first:
                    f.write(",\n")
                f.write(json_util.dumps(doc))
                first = False
            f.write("\n]\n")
        summary[col_name] = count

    meta_file = os.path.join(backup_dir, "metadata.json")
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "timestamp": timestamp,
                "database": MONGODB_DB,
                "summary": summary,
            },
            f,
            indent=2,
        )

    print(f"✅ Backup complete! Stored in {backup_dir}")
    return backup_dir


if __name__ == "__main__":
    backup_database()
