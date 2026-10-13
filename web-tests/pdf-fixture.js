export function samplePDF() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    '',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  for (const [index, text] of [[3,'Prueba del lector - pagina uno'],[5,'Prueba del lector - pagina dos']]) {
    const stream = `BT /F1 18 Tf 30 440 Td (${text}) Tj ET`;
    objects[index] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  }
  let pdf = '%PDF-1.4\n', offsets = [0];
  for (const [i,obj] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; }
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 8\n0000000000 65535 f \n${offsets.slice(1).map(x => `${String(x).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf);
}
