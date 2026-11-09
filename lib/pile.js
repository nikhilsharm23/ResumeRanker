import fs from "fs/promises";
import path from "path";
import { processBuffer } from "./process";
import { prettyName } from "./scoring";

export const RESUME_DIR = path.join(process.cwd(), "data", "resumes");
const SUPPORTED = [".pdf", ".docx", ".txt", ".md"];
const KNOWN_SOURCE_DIAGNOSES = {
  "anonymized_resume_1793685080327.docx":
    "This supplied DOCX was checked: its document body, headers, footers, and comments contain no text, and it has no embedded images. The source file is blank. Replace it with the original readable resume; re-saving this copy cannot restore missing content.",
};

// Allow only a simple file name to prevent path traversal.
export function resolveResumePath(fileName) {
  if (
    !fileName ||
    fileName === "." ||
    fileName === ".." ||
    path.basename(fileName) !== fileName ||
    !SUPPORTED.includes(path.extname(fileName).toLowerCase())
  ) return null;
  return path.join(RESUME_DIR, fileName);
}

// Process all supported files in data/resumes and return their results.
export async function loadPile() {
  let names = [];
  try {
    names = await fs.readdir(RESUME_DIR);
  } catch (error) {
    return [{
      id: "pile-read-error",
      fileName: "data/resumes",
      name: "Pile",
      source: "pile",
      status: "error",
      error: `The resume folder could not be read. ${error.message || "Unknown error."}`,
    }];
  }

  const results = [];
  for (const name of names.sort()) {
    // Skip temporary Microsoft Word files.
    if (name.startsWith(".") || name.startsWith("~$")) continue;
    if (!SUPPORTED.includes(path.extname(name).toLowerCase())) continue;

    try {
      const buffer = await fs.readFile(path.join(RESUME_DIR, name));
      const result = await processBuffer(buffer, name, { id: name, source: "pile" });
      if (result.status === "error" && KNOWN_SOURCE_DIAGNOSES[name]) {
        result.error = KNOWN_SOURCE_DIAGNOSES[name];
      }
      results.push(result);
    } catch (error) {
      results.push({
        id: name,
        fileName: name,
        name: prettyName(name),
        source: "pile",
        status: "error",
        error: `The file could not be read. ${error.message || "Unknown error."}`,
      });
    }
  }
  return results;
}
