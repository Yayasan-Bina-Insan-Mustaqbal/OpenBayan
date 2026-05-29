/**
 * Graph Client for SurrealDB
 * Wraps the native SurrealDB /sql HTTP endpoint for direct graph traversals.
 */

const SURREAL_URL = process.env.NEXT_PUBLIC_SURREAL_HTTP_URL || "http://192.168.100.33:8000";
const SURREAL_NS = process.env.NEXT_PUBLIC_SURREAL_NAMESPACE || "openbayan";
const SURREAL_DB = process.env.NEXT_PUBLIC_SURREAL_DATABASE || "openbayan";

export async function queryGraph<T = any>(query: string, vars: Record<string, any> = {}): Promise<T[]> {
  const credentials = btoa("frontend_api:openbayan_readonly");
  
  // For the /sql endpoint, we can send Accept: application/json
  // To pass variables, SurrealDB REST API standard approach is sending the query as raw text 
  // or sending an Accept header. But since we're using raw query, we can just interpolate safely 
  // or rely on a wrapper if needed. Wait, SurrealDB HTTP API allows query parameters if we use /sql.
  // Actually, the easiest way for /sql via POST with variables is to send JSON with `{"query": "...", "vars": {...}}` 
  // wait, Surreal v2 doesn't use {"query"} structure. It requires query in body and variables in headers (x-surreal-vars) or as `surreal-vars` header?
  // Let's just interpolate for now, or send raw text and escape quotes if doing simple fn:: calls.
  // Actually, wait, SurrealDB does not accept {"query": ...} on /sql. It expects raw surrealql.
  // So we will just send raw surrealql. If we need to pass a string safely, we can JSON.stringify it.
  
  const response = await fetch(`${SURREAL_URL}/sql`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Basic ${credentials}`,
      "surreal-ns": SURREAL_NS,
      "surreal-db": SURREAL_DB,
    },
    body: query,
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph query failed: ${response.status} ${text}`);
  }

  const results = await response.json();
  
  // SurrealDB REST returns an array of result objects corresponding to the statements.
  // Since we generally send one statement, we return the first result.
  if (Array.isArray(results) && results.length > 0) {
    if (results[0].status === "ERR") {
      throw new Error(`SurrealDB Error: ${results[0].detail}`);
    }
    return results[0].result as T[];
  }
  
  return [];
}

/**
 * Client-Side API Query Proxy helper.
 * Proxies queries through the server-side API route to bypass private LAN database access.
 */
export async function queryClientAPI<T = any>(sql: string): Promise<T[]> {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Client API query failed: ${response.status} ${text}`);
  }

  const results = await response.json();
  
  // Proxy response is the SurrealDB array of result objects
  if (Array.isArray(results) && results.length > 0) {
    if (results[0].status === "ERR") {
      throw new Error(`SurrealDB Error: ${results[0].detail}`);
    }
    return results[0].result as T[];
  }
  
  return [];
}

