/**
 * Lazy-loaded heavy dependencies
 * These libraries are only loaded when actually needed, reducing initial bundle size
 */

/**
 * Lazy load html2canvas for PDF export
 * Only loads when user clicks "Export as PDF"
 */
export async function loadHtml2Canvas() {
  const html2canvas = await import('html2canvas');
  return html2canvas.default;
}

/**
 * Lazy load pdfjs for PDF parsing
 * Only loads when user uploads a PDF resume
 */
export async function loadPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  // Disable worker to run PDF parsing in main thread (required for Chrome Extension CSP)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  return pdfjsLib;
}

/**
 * Lazy load papaparse for CSV parsing
 * Only loads when user uploads a CSV file for bulk analysis
 */
export async function loadPapaParse() {
  const Papa = await import('papaparse');
  return Papa.default;
}

/**
 * Extract text from PDF (lazy-loaded)
 */
export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return text;
}

/**
 * Parse CSV file (lazy-loaded)
 */
export async function parseCSV<T = any>(
  file: File,
  options?: any
): Promise<{ data: T[]; errors: any[]; meta: any }> {
  const Papa = await loadPapaParse();

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      ...options,
      complete: (results: any) => resolve(results),
      error: (error: any) => reject(error)
    });
  });
}

/**
 * Generate canvas from element (lazy-loaded)
 */
export async function generateCanvas(
  element: HTMLElement,
  options?: any
): Promise<HTMLCanvasElement> {
  const html2canvas = await loadHtml2Canvas();
  return await html2canvas(element, options);
}
