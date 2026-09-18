import { StaticPage, staticPageMetadata } from "@/components/pages/StaticPage";

export const metadata = staticPageMetadata("terms");

export default function Page() {
  return <StaticPage slug="terms" />;
}
