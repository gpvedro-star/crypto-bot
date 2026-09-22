import { useState } from 'react'
import type { Photo as PhotoData } from '../data/images'
import { src, srcSet } from '../data/images'

type Props = {
  photo: PhotoData
  className?: string
  imgClassName?: string
  /** The hero image must not be lazy — everything below the fold should be. */
  priority?: boolean
  /** Adds a slow zoom on hover, for gallery tiles. */
  zoomOnHover?: boolean
  sizes?: string
  /** Let the parent dictate the box instead of the photo's own ratio. */
  fill?: boolean
}

/**
 * Image primitive. Reserves space from the declared ratio so nothing shifts,
 * paints the average colour underneath while the file arrives, and fades the
 * photograph in once decoded.
 */
export function Photo({
  photo,
  className = '',
  imgClassName = '',
  priority = false,
  zoomOnHover = false,
  sizes = '100vw',
  fill = false,
}: Props) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: fill ? undefined : photo.ratio,
        backgroundColor: photo.tint,
      }}
    >
      <img
        src={src(photo)}
        srcSet={srcSet(photo)}
        alt={photo.alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[900ms] ease-brand ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${zoomOnHover ? 'group-hover:scale-[1.045] motion-reduce:group-hover:scale-100' : ''} ${imgClassName}`}
      />
    </div>
  )
}
