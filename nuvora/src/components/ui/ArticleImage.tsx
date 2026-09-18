import Image from "next/image";
import type { ImageAsset } from "@/content/types";

interface ArticleImageProps {
  image: ImageAsset;
  /** Aspect ratio class, e.g. "aspect-[16/10]". */
  ratio?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  zoom?: boolean;
  rounded?: boolean;
}

/**
 * Featured-image container. A fixed aspect ratio reserves space (no layout
 * shift), and the image pipeline can replace `image.src` without any
 * component changes.
 */
export function ArticleImage({ image, ratio = "aspect-[16/10]", sizes, priority, className = "", zoom = true, rounded = true }: ArticleImageProps) {
  return (
    <div className={`relative ${ratio} w-full overflow-hidden bg-mist ${rounded ? "rounded-image" : ""} ${zoom ? "image-zoom" : ""} ${className}`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={image.blurDataURL ? "blur" : "empty"}
        blurDataURL={image.blurDataURL}
        className="object-cover"
      />
    </div>
  );
}
