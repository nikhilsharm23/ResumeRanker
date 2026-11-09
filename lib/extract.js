import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// Extract plain text based on the file extension.
export async function extractText(buffer, fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();

  if (ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text || "";
    } finally {
      await parser.destroy();
    }
  }
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf8");
  }
  throw new Error(`Unsupported file type: .${ext}. Supported formats are PDF, DOCX, TXT, and MD.`);
}
