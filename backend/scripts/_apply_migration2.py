import pg8000
conn = pg8000.connect(
    host="db.rbmtphntktwlftplsvgj.supabase.co",
    port=5432,
    user="postgres",
    password="Elhassansoussi2326@",
    database="postgres",
    ssl_context=True
)
conn.autocommit = True
with open("migrations/20260327_add_onboarding_branding.sql") as f:
    sql = f.read()
for stmt in sql.split(";"):
    stmt = stmt.strip()
    if stmt:
        conn.run(stmt)
        print(f"OK: {stmt[:80]}...")
conn.close()
print("Migration applied successfully!")
