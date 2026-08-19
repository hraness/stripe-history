import { permanentRedirect } from "next/navigation";

export const dynamic = "force-static";

export default function LegacyAppearancesPage(): never {
  permanentRedirect("/history/appearances");
}
