import { createEmbedding } from "./embeddings";

const baseUrl = process.env.QDRANT_URL;
const apiKey = process.env.QDRANT_API_KEY;
export const collection = process.env.QDRANT_COLLECTION || "projects";

async function qdrant(path: string, init: RequestInit = {}) {
  if (!baseUrl) throw new Error("QDRANT_URL is not configured.");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "api-key": apiKey } : {}),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Qdrant request failed (${response.status}): ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

export async function ensureCollection() {
  if (!baseUrl) throw new Error("QDRANT_URL is not configured.");
  const check = await fetch(`${baseUrl.replace(/\/$/, "")}/collections/${encodeURIComponent(collection)}`, {
    headers: apiKey ? { "api-key": apiKey } : {}, cache: "no-store",
  });
  if (check.ok) return;
  if (check.status !== 404) throw new Error(`Could not check Qdrant collection (${check.status}).`);
  await qdrant(`/collections/${encodeURIComponent(collection)}`, {
    method: "PUT", body: JSON.stringify({ vectors: { size: 384, distance: "Cosine" } }),
  });
}

export async function indexProjects(projects: Array<{ project_id: number; title: string; description: string; difficulty: string; category_name: string | null; required_skills?: string[] }>) {
  await ensureCollection();
  const points = [];
  for (const p of projects) {
    const vector = await createEmbedding(`${p.title}. ${p.category_name || ""}. ${p.description || ""} Skills: ${(p as { required_skills?: string[] }).required_skills?.join(", ") || ""}`);
    points.push({ id: p.project_id, vector, payload: { project_id: p.project_id, title: p.title, description: p.description, difficulty: p.difficulty, category_name: p.category_name, category: p.category_name, status: "active", required_skills: (p as { required_skills?: string[] }).required_skills || [] } });
  }
  if (points.length) {
    await qdrant(`/collections/${encodeURIComponent(collection)}/points?wait=true`, {
      method: "PUT", body: JSON.stringify({ points }),
    });
  }
  return points.length;
}

export async function searchProjects(query: string, limit = 10) {
  await ensureCollection();
  const vector = await createEmbedding(query);
  const result = await qdrant(`/collections/${encodeURIComponent(collection)}/points/search`, {
    method: "POST", body: JSON.stringify({ vector, limit, with_payload: true, filter: { must: [{ key: "status", match: { value: "active" } }] } }),
  });
  return result.result || [];
}
