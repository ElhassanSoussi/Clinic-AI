"""
Apply the events + sales_leads migration to Supabase.

Usage:
  # Option 1: Provide DATABASE_URL
  DATABASE_URL=postgresql://... python _apply_migration.py

  # Option 2: Copy the SQL below and paste into the Supabase SQL Editor:
  #   https://supabase.com/dashboard/project/rbmtphntktwlftplsvgj/sql
"""

import os
import sys

MIGRATION_SQL = open(
    os.path.join(os.path.dirname(__file__), "migrations", "20260329_add_events_and_sales_leads.sql")
).read()

RLS_SQL = """
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public can insert events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated can read events" ON events FOR SELECT USING (true);

ALTER TABLE sales_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public can insert sales_leads" ON sales_leads FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated can read sales_leads" ON sales_leads FOR SELECT USING (true);
"""

def main():
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("=" * 60)
        print("No DATABASE_URL found.")
        print("Please run this SQL in the Supabase SQL Editor:")
        print("  https://supabase.com/dashboard/project/rbmtphntktwlftplsvgj/sql")
        print("=" * 60)
        print()
        print(MIGRATION_SQL)
        print()
        print(RLS_SQL)
        sys.exit(1)

    try:
        import psycopg2
    except ImportError:
        print("psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    print("Applying migration: events + sales_leads tables...")
    cur.execute(MIGRATION_SQL)
    print("Tables created.")

    print("Applying RLS policies...")
    cur.execute(RLS_SQL)
    print("RLS policies applied.")

    cur.close()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    main()
