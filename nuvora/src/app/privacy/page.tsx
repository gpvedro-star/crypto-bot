import { StaticPage, staticPageMetadata } from "@/components/pages/StaticPage";

export const metadata = staticPageMetadata("privacy");

export default function Page() {
  return <StaticPage slug="privacy" />;
}
