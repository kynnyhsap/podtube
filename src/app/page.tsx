import { CopyRssButton } from "@/components/CopyRssButton";
import { db } from "@/db";
import { SelectVideos, Videos } from "@/db/schema";
import { formatDuration } from "@/lib/format-duration";

function YouTubeVideoList({ videos }: { videos: SelectVideos[] }) {
  return (
    <div className="max-w-sm mx-auto shadow-lg rounded-lg overflow-hidden">
      {videos.map((video) => (
        <div className="relative overflow-hidden rounded-lg my-6">
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
  );
}

export default async function Home() {
  const videos = await db.select().from(Videos).all();

  return (
    <main className="text-center mx-auto">
      <h1>podtube</h1>

      <div className="my-8 flex gap-2 items-center justify-center">
        <input
          type="text"
          placeholder="youtube link"
          className="py-2 px-4 rounded text-gray-600"
        />

        {/* <Button>add</Button> */}
      </div>

      <div className="my-8">
        <CopyRssButton />
      </div>

      <YouTubeVideoList videos={videos} />
    </main>
  );
}
