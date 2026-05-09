// Извлечение текста из загруженных PDF/DOCX/TXT прямо в браузере.
// pdfjs и mammoth подгружаем динамически, чтобы не утяжелять основной бандл.

export async function extractTextFromFile(file) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';

  if (type === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
    return await file.text();
  }

  if (
    name.endsWith('.docx') ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const mammoth = await import('mammoth/mammoth.browser.js');
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
  }

  if (name.endsWith('.pdf') || type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    const workerSrc = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) pages.push(pageText);
    }

    return pages.join('\n\n');
  }

  throw new Error('Поддерживаются только .pdf, .docx и .txt');
}
