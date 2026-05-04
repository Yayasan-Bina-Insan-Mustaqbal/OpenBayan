import asyncio
from surrealdb import Surreal
import os

async def apply_schema():
    # Credentials from docker-compose
    url = "ws://localhost:8000/rpc"
    user = "root"
    password = "RwAbXjBc2z36z"
    namespace = "openbayan"
    database = "openbayan"
    
    schema_path = "OpenBayanBackend/schema/combined_schema.surql"
    
    print(f"Connecting to SurrealDB at {url}...")
    async with Surreal(url) as db:
        await db.connect()
        await db.signin({"user": user, "pass": password})
        await db.use(namespace, database)
        
        print(f"Reading schema from {schema_path}...")
        with open(schema_path, "r") as f:
            # We strip comments and split by semicolon to execute safely if needed,
            # but db.query() can handle multi-statement scripts.
            schema_sql = f.read()
            
        print("Applying schema...")
        try:
            # We wrap the whole thing in a single query call
            # SurrealDB handles multi-statement SQL in a single query
            results = await db.query(schema_sql)
            print("alhamdulillah! Schema applied successfully.")
            # print(results)
        except Exception as e:
            print(f"astagfirullah! Failed to apply schema: {e}")

if __name__ == "__main__":
    asyncio.run(apply_schema())
