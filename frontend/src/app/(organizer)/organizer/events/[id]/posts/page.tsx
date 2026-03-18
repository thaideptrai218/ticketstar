"use client";

// Event posts page — create and manage announcements/updates for attendees
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
}

export default function EventPostsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);

    // TODO: replace with real API call when backend is ready
    // await apiFetch(`/api/events/${eventId}/posts`, { method: "POST", body: JSON.stringify({ title, content }) });
    await new Promise((r) => setTimeout(r, 400));

    setPosts((prev) => [{
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date(),
    }, ...prev]);

    setTitle("");
    setContent("");
    setShowForm(false);
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <Link
        href={`/organizer/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Quay lại chi tiết sự kiện
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Bài đăng</h1>
          <p className="text-sm text-stone-400 mt-0.5">Thông báo và cập nhật tới người tham dự</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
        >
          <Plus className="size-4" />
          Bài đăng mới
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-stone-800">Tạo bài đăng mới</h2>
          <Input
            placeholder="Tiêu đề bài đăng..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-white"
          />
          <textarea
            placeholder="Nội dung thông báo tới người tham dự..."
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            required
            rows={4}
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || !content.trim() || isSubmitting}
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Send className="size-3.5" />
              {isSubmitting ? "Đang đăng..." : "Đăng"}
            </Button>
          </div>
        </form>
      )}

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-stone-100 mb-3">
            <FileText className="size-6 text-stone-400" />
          </div>
          <p className="font-medium text-stone-600 text-sm">Chưa có bài đăng nào</p>
          <p className="text-xs text-stone-400 mt-1 mb-4">Tạo bài đăng để thông báo tới người tham dự</p>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="size-3.5" /> Tạo bài đăng
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl border border-stone-200 bg-white p-5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-stone-900">{p.title}</h3>
                <div className="flex items-center gap-1 text-xs text-stone-400 shrink-0">
                  <Clock className="size-3" />
                  {p.createdAt.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{p.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
