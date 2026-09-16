// Запуск: osascript -l JavaScript scripts/extract-iyt-text.js "<путь к PDF>" > .local/iyt_bbs.txt
ObjC.import('PDFKit');

function run(argv) {
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));
  if (doc.isNil()) throw new Error(`Не удалось открыть PDF: ${argv[0]}`);
  const pages = [];
  for (let i = 0; i < doc.pageCount; i += 1) {
    const text = doc.pageAtIndex(i).string;
    pages.push(`=== PAGE ${i + 1} ===\n${text.isNil() ? '' : text.js}`);
  }
  return pages.join('\n');
}
