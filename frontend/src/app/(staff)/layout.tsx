// Thin wrapper for staff (check-in) routes
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#faf8f5]">
        <header className="border-b border-stone-200 bg-white px-4 py-3">
          <p className="text-sm font-medium text-stone-600">Chế độ nhân viên — Check-in</p>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
