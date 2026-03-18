// Redirect /settings → /settings/profile
import { redirect } from "next/navigation";

export default function SettingsIndexPage() {
  redirect("/settings/profile");
}
