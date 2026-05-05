import asyncio
from surrealdb import AsyncSurreal
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def apply_schema():
    # Credentials from .env
    url = os.getenv("SURREALDB_URL", "ws://localhost:8000/rpc")
    user = os.getenv("SURREALDB_USERNAME", "root")
    password = os.getenv("SURREALDB_PASSWORD", "root")
    namespace = os.getenv("SURREALDB_NAMESPACE", "OpenBayan")
    database = os.getenv("SURREALDB_DATABASE", "OpenBayan")
    
    schema_path = "schema/combined_schema.surql"
    if not os.path.exists(schema_path):
        schema_path = "OpenBayanBackend/schema/combined_schema.surql"
    
    print(f"Connecting to SurrealDB at {url} (NS: {namespace}, DB: {database})...")
    async with AsyncSurreal(url) as db:
        await db.signin({"user": user, "pass": password})
        await db.use(namespace, database)
        
        print(f"Reading schema from {schema_path}...")
        with open(schema_path, "r") as f:
            schema_sql = f.read()
            
        print("Applying schema...")
        try:
            # We wrap the whole thing in a single query call
            # SurrealDB handles multi-statement SQL in a single query
            await db.query(schema_sql)
            print("alhamdulillah! Schema applied successfully.")
        except Exception as e:
            print(f"astagfirullah! Failed to apply schema: {e}")

if __name__ == "__main__":
    asyncio.run(apply_schema())
