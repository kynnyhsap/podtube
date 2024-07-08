import Queue from "bull";
import { readableStreamToArrayBuffer, spawn } from "bun";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME, r2client } from "./r2";
import { getVideo } from "./db/get-video";

const queue = new Queue<{ id: string }>("queue", process.env.REDIS_URL!);

queue.process(async (job) => {
  const { id } = job.data;

  const filename = id; // TODO: with mp3

  const m = `[Queue job ${job.id}] video ${id} | `;
  console.log(m + `Started processing job.`);

  job.progress(1);

  // check if the video is already downloaded
  try {
    const { ContentLength } = await r2client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
      }),
    );

    console.log(m + `Audio already uploded to file storage.`, {
      ContentLength,
    });

    job.progress(100);

    return;
  } catch (e) {
    console.log(m + `Audio not found in file storage.`);
  }

  console.log(m + `Downloading audio...`);

  job.progress(5);

  const video = await getVideo(id);

  job.progress(10);

  console.time("yt-dlp dowloading");

  console.log(m + `Downloading audio with yt-dlp...`);

  const ytdlp = spawn(`yt-dlp ${id} -q -f ba -o -`.split(" "));
  const audioBuffer = await readableStreamToArrayBuffer(ytdlp.stdout);

  console.timeEnd("yt-dlp dowloading");

  job.progress(20);

  console.time("id3v2");

  console.log(m + "Adding ID3V2 metadata headers to the audio file...");

  // add ID3V2 metadata to the audio file
  const ffmpeg = spawn(
    [
      ..."ffmpeg -i pipe:0 -f wav -id3v2_version 3".split(" "),
      ..."-hide_banner -loglevel error".split(" "),

      "-metadata",
      "genre=Podcast",
      "-metadata",
      `title=${video.title}`,
      "-metadata",
      `artist=${video.channel}`,

      "-",
    ],
    {
      stdin: "pipe",
      stdout: "pipe",
    },
  );

  ffmpeg.stdin.write(audioBuffer);
  ffmpeg.stdin.end();

  const audioWithID3V2 = Buffer.from(
    await readableStreamToArrayBuffer(ffmpeg.stdout),
  );

  console.timeEnd("id3v2");

  job.progress(25);

  console.time("r2 upload");

  console.log(m + `Uploading audio to file storage...`);

  const result = await r2client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: audioWithID3V2,
      ContentType: "audio/mpeg",
    }),
  );

  console.log(m + `Audio uploaded to file storage.`, result);

  console.timeEnd("r2 upload");

  job.progress(100);

  console.log(m + `Finished job.`);

  return;
});

queue.on("error", (error) => {
  console.error(`Job failed:`, error);
});

// queue.on("progress", (job) => {
//   console.log(`Job ${job.id} is ${job.progress()}% done`);
// });

export async function launchJob(id: string) {
  const jobs = await queue.getJobs(["active", "waiting", "delayed"]);

  const alreadyProcessing = jobs.some((job) => job.data.id === id);

  if (alreadyProcessing) {
    console.log(
      `Job for video ${id} already exists. Skipping diplicate launch.`,
    );
    return;
  }

  try {
    return await queue.add({ id });
  } catch (e) {
    console.error(`Failed to launch job for video ${id}`, e);
  }
}
