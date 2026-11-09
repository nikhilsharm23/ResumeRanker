// Extract plain text based on the file extension.
export async function extractText(buffer, fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();

  if (ext === "pdf") {
    // The pdf-parse worker installs the canvas-backed DOMMatrix, Path2D, and
    // ImageData globals that PDF.js needs in a Node serverless runtime.
    const { CanvasFactory } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer, CanvasFactory });
    try {
      const result = await parser.getText();
      return result.text || "";
    } finally {
      await parser.destroy();
    }
  }
  if (ext === "docx") {
    const mammothModule = await import("mammoth");
    const mammoth = mammothModule.default || mammothModule;
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf8");
  }
  throw new Error(`Unsupported file type: .${ext}. Supported formats are PDF, DOCX, TXT, and MD.`);
}
