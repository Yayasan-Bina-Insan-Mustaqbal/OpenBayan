
export async function querySurreal(sql: string) {
  const surrealUrl = process.env.SURREAL_HTTP_URL ?? "http://192.168.100.33:8000"
  const surrealNamespace = process.env.SURREAL_NAMESPACE ?? "openbayan"
  const surrealDatabase = process.env.SURREAL_DATABASE ?? "openbayan"

  const response = await fetch(`${surrealUrl}/sql`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Surreal-NS": surrealNamespace,
      "Surreal-DB": surrealDatabase,
      Authorization: "Basic " + Buffer.from("root:RwAbXjBc2z36z").toString("base64"),
    },
    body: sql,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`SurrealDB query failed: ${response.statusText}`)
  }

  return response.json()
}
