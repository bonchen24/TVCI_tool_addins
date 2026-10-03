import { NextResponse } from 'next/server';
import { proofreadAdministrativeText } from '@/ai/proofreading';
import { AiServiceError } from '@/ai/types';
import { protectedApiResponse } from '@/auth/access-control';

export async function POST(request: Request) {
  const authError = protectedApiResponse(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const result = await proofreadAdministrativeText(body);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AiServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 }
      );
    }
    const message = error instanceof Error ? error.message : 'Lỗi xử lý yêu cầu soát lỗi AI';
    const isValidation =
      message.includes('không được để trống') ||
      message.includes('không hợp lệ') ||
      message.includes('ghi đè');
    return NextResponse.json(
      { error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
