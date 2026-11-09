import { randomUUID } from "crypto";
import { processBuffer } from "../../../lib/process";

export const runtime = "nodejs";
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md"]);

// Analyze one uploaded resume and return its result.
export async function POST(req) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { status: "error", fileName: "unknown", error: "The upload request is invalid." },
      { status: 400 },
    );
  }

  const file = form.get("file");

  if (!file || typeof file === "string") {
    return Response.json(
      { status: "error", fileName: "unknown", error: "No file was provided." },
      { status: 400 },
    );
  }

  const extension = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return Response.json(
      { status: "error", fileName: file.name || "unknown", error: "Unsupported file type. Upload a PDF, DOCX, TXT, or MD file." },
      { status: 415 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { status: "error", fileName: file.name, error: "The file exceeds the 15 MB upload limit." },
      { status: 413 },
    );
  }
  if (file.size === 0) {
    return Response.json(
      { status: "error", fileName: file.name || "unknown", error: "The uploaded file is empty." },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processBuffer(buffer, file.name, {
      id: `upload-${randomUUID()}`,
      source: "upload",
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        status: "error",
        fileName: file.name || "unknown",
        error: `The file could not be read. ${error.message || "Unknown error."}`,
      },
      { status: 500 },
    );
  }
}
