import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.xlsx', '.xls', '.csv']);

// Verify the request comes from an authenticated user
async function verifyAuth(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  try {
    // Auth guard
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const extension = '.' + fileName.split('.').pop();

    // File type validation
    if (!ALLOWED_TYPES.has(fileType) && !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'Formato de archivo no soportado. Use PDF, XLSX, XLS o CSV.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

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

    // Sanitize: limit output text length to prevent DoS
    const MAX_TEXT_LENGTH = 50000;
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n... (texto truncado por límite de tamaño)';
    }

    return NextResponse.json({ text, type: fileType, pages });

  } catch (error: any) {
    console.error('Error parsing file:', error);
    return NextResponse.json(
      { error: 'Error al procesar el archivo' },
      { status: 500 }
    );
  }
}
