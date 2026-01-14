import { useState } from 'react';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { Image as ImageIcon } from 'lucide-react';

interface ImageGridProps {
  images: Array<{
    id: string;
    externalLink: string;
    filename: string;
  }>;
}

export function ImageGrid({ images }: ImageGridProps) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = images.map(img => ({
    src: img.externalLink,
    alt: img.filename,
  }));

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-1 mt-2">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="relative aspect-square cursor-pointer overflow-hidden rounded-md border"
          onClick={() => {
            setCurrentIndex(index);
            setOpen(true);
          }}
        >
          <img
            src={image.externalLink}
            alt={image.filename}
            className="absolute inset-0 h-full w-full object-cover hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          {index === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-sm font-medium">+{images.length - 4}</span>
            </div>
          )}
        </div>
      ))}
      
      {images.length > 4 && images.slice(4).map((_, index) => (
        <div key={`hidden-${index}`} className="hidden" />
      ))}

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={slides}
        index={currentIndex}
        plugins={[Zoom, Fullscreen, Thumbnails]}
        thumbnails={{ 
          position: 'start',
          width: 60,
          height: 60,
          border: 0,
          padding: 4,
          gap: 4,
          borderRadius: 4,
        }}
        animation={{ fade: 300 }}
        controller={{ closeOnBackdropClick: true }}
        carousel={{ finite: false }}
      />
    </div>
  );
}

export function SingleImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div 
        className="aspect-square w-16 cursor-pointer overflow-hidden rounded-md border"
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
      </div>
      
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={[{ src, alt }]}
        plugins={[Zoom, Fullscreen]}
      />
    </>
  );
}