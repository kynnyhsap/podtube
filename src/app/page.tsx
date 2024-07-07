import { CopyRssButton } from "@/components/CopyRssButton";
import { YouTubeUriInput } from "@/components/YouTubeUriInput";
import { db } from "@/db";
import { SelectVideos, Videos } from "@/db/schema";
import { formatDuration } from "@/lib/format-duration";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: any }) {
  const { uri } = searchParams;

  const videos = await db.select().from(Videos).all();

  return (
    <main className="text-center mx-auto">
      <h1 className="text-2xl font-bold my-16">
        <span className="text-red-500">pod</span>
        <span>tube</span>
      </h1>

      <YouTubeUriInput defaultUri={uri ?? ""} />

      <div className="my-8">
        <CopyRssButton />
      </div>

      <YouTubeVideoList videos={videos} />
    </main>
  );
}

function YouTubeVideoList({ videos }: { videos: SelectVideos[] }) {
  return (
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
  );
}
