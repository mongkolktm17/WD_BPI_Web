import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <h1 className="text-6xl font-black text-blue-900 mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-700 mb-4">ไม่พบหน้าที่คุณต้องการ (Page Not Found)</h2>
      <p className="text-slate-500 mb-6 max-w-md">
        หน้าที่คุณกำลังค้นหาไม่มีอยู่ในระบบ หรืออาจถูกย้ายไปยังตำแหน่งอื่น
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
      >
        กลับหน้าหลัก (Back to Dashboard)
      </Link>
    </div>
  );
}
