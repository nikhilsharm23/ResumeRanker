import { randomUUID } from "crypto";
import { extractText } from "./extract";
import { analyzeText, prettyName } from "./scoring";

// Process one file from extraction through scoring. Failures are returned as
// result rows so the rest of the resume library can still be processed.
export async function processBuffer(buffer, fileName, { id, source }) {
  const base = {
    id: id || randomUUID(),
    fileName,
    name: prettyName(fileName),
    source, // "pile" or "upload"
  };
  try {
    const text = await extractText(buffer, fileName);
    const analysis = analyzeText(text, fileName);
    return { ...base, status: "ok", ...analysis };
  } catch (e) {
    return { ...base, status: "error", error: e.message || "Unknown error." };
  }
}
