import { db } from "./db";
import { UserVideos, Videos } from "./db/schema";
import { launchJob } from "./queue";
import { readableStreamToText, spawn } from "bun";
import { and, eq } from "drizzle-orm";
import youtubeId from "youtube-video-id";

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

async function addUserVideo(userId: string, videoId: string) {
  const [existing] = await db
    .select()
    .from(UserVideos)
    .where(and(eq(UserVideos.videoId, videoId), eq(UserVideos.userId, userId)));

  if (existing) {
    console.log(`User ${userId} already added video ${videoId} once.`);

    return existing;
  }

  const [result] = await db
    .insert(UserVideos)
    .values({ userId, videoId })
    .returning();

  console.log(`User ${userId} added video ${videoId}.`);

  return result;
}

async function extractMetadata(id: string) {
  console.log(`Extracting metadata for video ${id} using yt-dlp...`);

  const key = `[yt-dlp metadata extraction] ${id}`;

  console.time(key);

  const { stdout } = spawn(`yt-dlp -f ba -s -j ${id}`.split(" "));

  const result = JSON.parse(
    await readableStreamToText(stdout),
  ) as YtDlpMetadataResult;

  console.timeEnd(key);

  return result;
}

export async function extract(uri: string, userId: string) {
  console.log(`Extracting video ${uri} for user ${userId}...`);

  const id = youtubeId(uri);

  // const [existingVideo] = await db
  //   .select()
  //   .from(Videos)
  //   .where(eq(Videos.id, id));

  // if (existingVideo) {
  //   console.log(
  //     `Video ${id} was already extracted once. No need for another extraction.`,
  //   );

  //   await addUserVideo(userId, id);

  //   await launchJob(id);

  //   // await extractMetadata(id);

  //   return existingVideo;
  // }

  // const {
  //   title,
  //   thumbnail,
  //   description,
  //   channel,
  //   duration,
  //   filesize,
  //   filesize_approx,
  //   webpage_url,
  // } = await extractMetadata(id);

  // const [video] = await db
  //   .insert(Videos)
  //   .values({
  //     id,

  //     title,
  //     thumbnail,
  //     description,
  //     channel,

  //     url: webpage_url,

  //     duration: Math.round(duration) ?? 0,
  //     length: filesize ?? filesize_approx ?? 0,
  //   })
  //   .returning();

  // await addUserVideo(userId, id);

  await launchJob(id);

  // return video;
}
