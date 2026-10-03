import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TVCI DocMaster — Hệ thống Soạn thảo & Chuẩn hóa Thể thức Văn bản NĐ 30',
  description:
    'Hệ thống soạn thảo, kiểm tra thể thức Nghị định 30/2020/NĐ-CP, biểu mẫu hành chính và AI trợ lý văn phòng TVCI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={plusJakarta.variable}>
      <body className="min-h-screen w-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
