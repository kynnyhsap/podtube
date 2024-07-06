import Queue from "bee-queue";
import { createClient } from "redis";
import { readableStreamToArrayBuffer, spawn } from "bun";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { BUCKET_NAME, r2client } from "./r2";
import { db } from "./db";
import { Videos } from "./db/schema";

type JobData = {
  id: string;
};

export const queue = new Queue<JobData>("dowload-queue", {
  redis: createClient({
    url: process.env.REDIS_URL!,
  }),
});

export async function jobHandler(job: Queue.Job<JobData>) {
  const { id } = job.data;

  const m = `[Queue job ${job.id}] `;

  console.log(m + `Started processing dowload job for YouTube video ${id}...`);

  const [video] = await db.select().from(Videos).where(eq(Videos.id, id));

  const ytdlp = spawn(`yt-dlp ${id} -q -f ba -o -`.split(" "), {
    stderr: "ignore",
  });

  const audioBuffer = Buffer.from(
    await readableStreamToArrayBuffer(ytdlp.stdout),
  );

  const ffmpeg = spawn(
    [
      ..."ffmpeg -i pipe:0 -f wav -id3v2_version 3".split(" "),

      "-metadata",
      "genre=Podcast",
      "-metadata",
      `title=${video.title}`,

      "-",
    ],
    {
      stdin: "pipe",
      stdout: "pipe",
      // quiet: true,
    },
  );

  ffmpeg.stdin.write(audioBuffer);
  ffmpeg.stdin.end();

  const buff = Buffer.from(await readableStreamToArrayBuffer(ffmpeg.stdout));

  const result = await r2client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: id,
      Body: buff,
      ContentType: "audio/mpeg",
    }),
  );

  return result;
}

queue.process(jobHandler);
