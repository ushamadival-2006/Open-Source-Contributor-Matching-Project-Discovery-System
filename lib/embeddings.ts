import { createHash } from "node:crypto";

// Keep this algorithm identical to backend/app/embeddings.py so both modules
// can index/query the same Qdrant collection without external API credentials.
export const EMBEDDING_DIM = 384;

export async function createEmbedding(text: string): Promise<number[]> {
  const vector = new Array<number>(EMBEDDING_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [];
  const features = [...tokens, ...tokens.slice(0, -1).map((token, i) => `${token} ${tokens[i + 1]}`)];
  for (const feature of features) {
    const digest = createHash("md5").update(feature).digest("hex");
    const hash = BigInt(`0x${digest}`);
    const index = Number(hash % BigInt(EMBEDDING_DIM));
    vector[index] += ((hash >> 64n) & 1n) === 1n ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map(value => value / norm);
}
