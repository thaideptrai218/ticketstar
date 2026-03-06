// Thin wrapper for attendee routes — no sidebar needed, uses root app layout

export default function AttendeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
