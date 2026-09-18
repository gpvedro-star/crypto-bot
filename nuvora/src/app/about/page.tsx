import { StaticPage, staticPageMetadata } from "@/components/pages/StaticPage";

export const metadata = staticPageMetadata("about");

export default function Page() {
  return <StaticPage slug="about" />;
}
