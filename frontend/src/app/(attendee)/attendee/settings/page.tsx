// Attendee settings placeholder — redirects to security settings
import { redirect } from "next/navigation";

export default function AttendeeSettingsPage() {
  redirect("/settings/security");
}
