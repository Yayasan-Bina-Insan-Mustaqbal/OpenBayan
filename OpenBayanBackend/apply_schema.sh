#!/bin/bash
# Helper script to apply SurrealDB schema

SCHEMA_FILE="schema/init.surql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Error: $SCHEMA_FILE not found."
    exit 1
fi

echo "Applying schema from $SCHEMA_FILE to bayan_surrealdb..."
cat "$SCHEMA_FILE" | docker exec -i bayan_surrealdb /surreal sql --user root --pass root --ns main --db main

if [ $? -eq 0 ]; then
    echo "Alhamdulillah, schema applied successfully!"
else
    echo "Astagfirullah, something went wrong while applying the schema."
fi
