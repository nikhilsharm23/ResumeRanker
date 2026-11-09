import fs from "fs/promises";
import path from "path";
import { resolveResumePath } from "../../../../lib/pile";

const TYPES = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

// Serve an original resume for review.
export async function GET(_req, { params }) {
  const filePath = resolveResumePath(params.name);
  if (!filePath) return new Response("Invalid file name", { status: 400 });

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new Response(buffer, {
      headers: {
        "Content-Type": TYPES[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      },
    });
  } catch {
    return new Response("Resume not found.", { status: 404 });
  }
}
