import type { Img as ImgData, Link } from "../lib/types";
import { HeroVideo } from "./HeroVideo";
import { Img } from "./Img";

export interface HeroProps {
  eyebrow: string; headline: string; sub: string;
  primaryCta: Link; secondaryCta: Link;
  image?: ImgData; video?: { src: string; poster?: string };
  credit?: { name: string; url: string };
}

export function Hero({ eyebrow, headline, sub, primaryCta, secondaryCta, image, video, credit }: HeroProps) {
  return (
    <section id="hero" className="hero tone-dark" aria-label="Introduction">
      <div className="hero-media" aria-hidden="true">
        {image && <Img img={image} eager sizes="100vw" className="hero-img" />}
        {video && <HeroVideo src={video.src} poster={video.poster ?? image?.src} />}
        <div className="hero-scrim" />
      </div>
      <div className="container hero-inner">
        <p className="eyebrow hero-eyebrow">{eyebrow}</p>
        <h1 className="display display-xl hero-title">{headline}</h1>
        <p className="lede hero-sub">{sub}</p>
        <div className="hero-actions">
          <a className="btn" href={primaryCta.href}>{primaryCta.label}</a>
          <a className="btn btn-ghost" href={secondaryCta.href}>{secondaryCta.label}</a>
        </div>
      </div>
      {credit && <p className="hero-credit">Photo: <a href={credit.url} rel="noopener noreferrer">{credit.name}</a> / Pexels</p>}
    </section>
  );
}
