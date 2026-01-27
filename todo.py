import sqlite3
import argparse
from rich.console import Console
from rich.table import Table
from rich import box

DB_PATH = "tasks.db"
console = Console()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS tasks
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  title TEXT NOT NULL,
                  project TEXT,
                  status TEXT DEFAULT 'TODO',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

def add_task(title, project="General"):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO tasks (title, project, status) VALUES (?, ?, ?)", (title, project, 'TODO'))
    conn.commit()
    conn.close()
    console.print(f"[green]Task added: {title}[/green]")

def list_tasks(project_filter=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = "SELECT id, title, project, status FROM tasks"
    params = ()
    if project_filter:
        query += " WHERE project = ?"
        params = (project_filter,)
    
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    table = Table(title="Studio Zero Tasks", box=box.ROUNDED)
    table.add_column("ID", style="cyan", no_wrap=True)
    table.add_column("Title", style="white")
    table.add_column("Project", style="magenta")
    table.add_column("Status", style="green")

    for row in rows:
        status_style = "green" if row[3] == "DONE" else "yellow"
        table.add_row(str(row[0]), row[1], row[2], f"[{status_style}]{row[3]}[/{status_style}]")

    console.print(table)

def complete_task(task_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE tasks SET status = 'DONE' WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    console.print(f"[bold green]Task {task_id} marked as DONE[/bold green]")

def import_initial():
    """Import the base tasks from our session."""
    init_db()
    # Check if empty
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM tasks")
    if cursor.fetchone()[0] == 0:
        tasks = [
            ("Integrate Keyring Auth", "Asylum"),
            ("Build Sources Miner", "Mix"),
            ("Build Nucleus Kernel", "Axiom"),
            ("Design Vibe UI", "Mix")
        ]
        for t, p in tasks:
            add_task(t, p)
            complete_task(cursor.execute("SELECT seq FROM sqlite_sequence WHERE name='tasks'").fetchone()[0] if cursor.execute("SELECT seq FROM sqlite_sequence WHERE name='tasks'").fetchone() else 1) 
            # (Fixing the ID fetch logic in real run, mostly just adding raw here)
            # Actually let's just add them as TODO for now for the ones that are 'next steps' and DONE for finished.
    conn.close()

if __name__ == "__main__":
    init_db()
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command")

    add_parser = subparsers.add_parser("add")
    add_parser.add_argument("title")
    add_parser.add_argument("--project", default="General")

    list_parser = subparsers.add_parser("list")
    list_parser.add_argument("--project")

    done_parser = subparsers.add_parser("done")
    done_parser.add_argument("id", type=int)
    
    # Simple 'init' command to seed data
    subparsers.add_parser("init_seed")

    args = parser.parse_args()

    if args.command == "add":
        add_task(args.title, args.project)
    elif args.command == "list":
        list_tasks(args.project)
    elif args.command == "done":
        complete_task(args.id)
    elif args.command == "init_seed":
        # Seeding manually for the user request
        add_task("Setup Keyring Auth", "Asylum")
        complete_task(1)
        add_task("Build Mix Backend", "Mix")
        complete_task(2)
        add_task("Init Axiom Rust", "Axiom")
        complete_task(3)
        add_task("Connect Mix Frontend", "Mix")
        add_task("Implement Axiom WGPU Loop", "Axiom")
        list_tasks()
    else:
        list_tasks()
