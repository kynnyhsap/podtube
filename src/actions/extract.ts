import { $ } from "bun";
import { db } from "@/db";
import { UserVideos, Videos } from "@/db/schema";
import { queue } from "@/queue";

export async function extract(uri: string) {
  const userId = "andrew"; // TODO

  const metadata = JSON.parse(
    await $`yt-dlp -f ba -s -j ${uri}`.text(),
  ) as YtDlpMetadataResult;

  const [video] = await db
    .insert(Videos)
    .values({
      id: metadata.id,

      title: metadata.title,
      thumbnail: metadata.thumbnail,
      description: metadata.description,
      channel: metadata.channel,

      url: metadata.webpage_url,

      duration: Math.round(metadata.duration) ?? 0,
      length: metadata.filesize ?? metadata.filesize_approx ?? 0,
    })
    .returning();

  await db.insert(UserVideos).values({
    userId,
    videoId: video.id,
  });

  try {
    const job = await queue.createJob({ id: video.id }).save();
    job.on("succeeded", async (result: any) =>
      console.log(`Received result for narration job ${job.id}:`, result),
    );
  } catch (e) {
    console.error("Failed to launch narraion job.", e);
  }

  return video;
}

type YtDlpMetadataResult = {
  id: string;
  title: string;
  channel: string;
  uploader_url: string;
  duration: number;
  duration_string: string;
  thumbnail: string;
  description: string;
  chapters: any;
  webpage_url: string;
  filesize: number;
  filesize_approx: number;
  url: string;
};
