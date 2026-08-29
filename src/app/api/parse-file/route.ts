import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    let text = '';
    let pages = 0;

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const pdfData = await pdf(buffer);
      text = pdfData.text;
      pages = pdfData.numpages;
    } 
    else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'text/csv' ||
      fileName.endsWith('.xlsx') || 
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv')
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      text = workbook.SheetNames.map(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        return `--- Sheet: ${sheetName} ---\n` + XLSX.utils.sheet_to_csv(sheet);
      }).join('\n\n');
    } 
    else {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    return NextResponse.json({ text, type: fileType, pages });

  } catch (error: any) {
    console.error('Error parsing file:', error);
    return NextResponse.json(
      { error: 'Error parsing file: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
