interface IntroVideoPlayerProps {
  url: string;
}

export function IntroVideoPlayer({ url }: IntroVideoPlayerProps) {
  return (
    <div className="relative w-full max-h-[70vh] mx-auto rounded-2xl overflow-hidden bg-stone-900">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video src={url} className="w-full h-full max-h-[70vh]" controls preload="metadata" />
    </div>
  );
}
