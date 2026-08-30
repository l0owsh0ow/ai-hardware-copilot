"""备份 SQLite 数据库与向量库到 backend/backups/。"""

import os
import shutil
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")
BACKUP_DIR = os.path.join(BACKEND, "backups")


def main() -> None:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = os.path.join(BACKUP_DIR, stamp)
    os.makedirs(dest, exist_ok=True)

    db = os.path.join(BACKEND, "data", "components.db")
    if os.path.exists(db):
        shutil.copy2(db, os.path.join(dest, "components.db"))

    chroma = os.path.join(BACKEND, "data", "chroma")
    if os.path.exists(chroma):
        shutil.copytree(chroma, os.path.join(dest, "chroma"))

    print(f"备份完成: {dest}")


if __name__ == "__main__":
    main()
