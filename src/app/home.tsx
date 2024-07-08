import { SelectVideos } from "../db/schema";
import { formatDuration } from "../rss";

export function Home({
  videos,
  uri,
}: {
  videos: SelectVideos[];
  uri?: string;
}) {
  return (
    <main className="text-center mx-auto">
      <h1 className="text-2xl font-bold my-16">
        <span className="text-red-500">pod</span>
        <span>tube</span>
      </h1>

      <div className="flex gap-4 items-center justify-center">
        <input
          id="youtube-link-input"
          type="text"
          placeholder="youtube link"
          className="py-2 px-4 rounded text-gray-600"
          value={uri}
        />

        <button
          id="add-button"
          className="py-2 px-4 rounded bg-red-500 hover:bg-red-500/90 transition-colors"
        >
          add
        </button>
      </div>

      <div className="my-8">
        <button
          id="copy-button"
          className="cursor-pointer py-2 px-4 rounded bg-transparent border-2 border-orange-200 hover:bg-orange-200 transition-colors"
        >
          📋 copy rss
        </button>
      </div>

      <div className="max-w-sm mx-auto shadow-lg rounded-lg overflow-hidden">
        {videos.map((video) => (
          <div
            key={video.id}
            className="relative overflow-hidden rounded-lg my-6"
          >
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-md opacity-50"
              style={{ backgroundImage: `url(${video.thumbnail})` }}
            />

            <div className="relative flex gap-2 p-3 items-center">
              <img
                className="w-24 h-15 object-cover rounded"
                src={video.thumbnail}
                alt={video.title}
              />

              <h3 className="font-semibold text-sm truncate">{video.title}</h3>

              <span className="text-xs bg-black bg-opacity-60 text-white px-1 py-0.5 rounded absolute bottom-1 right-1">
                {formatDuration(video.duration)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
