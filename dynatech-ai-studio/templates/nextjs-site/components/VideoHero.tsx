import { Hero, type HeroProps } from "./Hero";

/** Hero intended for a video source. Falls back to the still image if none is provided. */
export function VideoHero(props: HeroProps) {
  return <Hero {...props} />;
}
export type { HeroProps as VideoHeroProps };
