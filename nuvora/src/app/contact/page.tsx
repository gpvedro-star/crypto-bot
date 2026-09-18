import { StaticPage, staticPageMetadata } from "@/components/pages/StaticPage";

export const metadata = staticPageMetadata("contact");

export default function Page() {
  return <StaticPage slug="contact" />;
}
