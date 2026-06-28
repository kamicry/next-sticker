import type { CharacterConfig } from "@/types";
import StickerMaker from "@/components/StickerMaker";

// ── data URLs ────────────────────────────────────────────────────

const PJSK_URL =
  process.env.CHARACTERS_URL_PJSK ??
  "https://raw.githubusercontent.com/kamicry/arcpjsk-hub/main/pjsk/characters.json";

const ARCAEA_URL =
  process.env.CHARACTERS_URL_ARCAEA ??
  "https://raw.githubusercontent.com/kamicry/arcpjsk-hub/main/arcaea/characters.json";

// ── shared fetch helper ──────────────────────────────────────────

async function fetchCharacters(url: string): Promise<CharacterConfig[]> {
  const res = await fetch(url, {
    next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
  });
  if (!res.ok) {
    console.error(`Failed to fetch characters from ${url}: ${res.status}`);
    return [];
  }
  return res.json() as Promise<CharacterConfig[]>;
}

// ── page ─────────────────────────────────────────────────────────

export default async function Home() {
  const [pjsk, arcaea] = await Promise.all([
    fetchCharacters(PJSK_URL),
    fetchCharacters(ARCAEA_URL),
  ]);

  return <StickerMaker pjskCharacters={pjsk} arcaeaCharacters={arcaea} />;
}
