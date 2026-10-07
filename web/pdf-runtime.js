let pdfModule;

export const pdfDocumentOptions = {
  cMapUrl: '/vendor/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/vendor/standard_fonts/',
  wasmUrl: '/vendor/wasm/'
};

export async function getPdfModule() {
  if (!pdfModule) {
    pdfModule = await import('/vendor/legacy/build/pdf.mjs');
    pdfModule.GlobalWorkerOptions.workerSrc = '/vendor/legacy/build/pdf.worker.mjs';
  }
  return pdfModule;
}
