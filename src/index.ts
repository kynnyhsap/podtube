import { Hono } from "hono";
import { logger } from "hono/logger";
import { buildRss } from "./rss";
import { serveStatic } from "hono/bun";
import { HTTPException } from "hono/http-exception";
import { db } from "./db";
import { Users, UserVideos, Videos } from "./db/schema";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { extractMetadata } from "./extract-metadata";
import { dowloadAudio } from "./download-audio";
import { uploadAudioToR2 } from "./upload-audio-to-r2";
import { streamAudioFromR2 } from "./stream-audio-from-r2";
import { format } from "date-fns";
import { updateID3V2Metadata } from "./update-id3v2-metadata";
import { readableStreamToArrayBuffer } from "bun";
import path from "path";

const PORT = process.env.PORT ?? 3000;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

const app = new Hono();

app.use(logger());

app.use("/", serveStatic({ path: "./public/index.html" }));

app.use(`/public/*`, serveStatic({ root: "." }));

app.post("/add", async (c) => {
  const userId = "andrew"; // TODO: get from auth

  const { uri } = await c.req.json<{ uri?: string }>();
  if (!uri) {
    throw new HTTPException(400, {
      message: "Youtube video URI is missing from request body.",
    });
  }

  console.log(`Adding YouTube video ${uri} for user ${userId}.`);

  const [metadata, audioStream] = await Promise.all([
    extractMetadata(uri),
    dowloadAudio(uri),
  ]);

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

  const audioBuffer = Buffer.from(
    await readableStreamToArrayBuffer(audioStream),
  );

  console.time("updateAudioID3V2Metadata");
  const updateAudioStream = await updateID3V2Metadata(audioBuffer, {
    title: video.title,
    artist: video.channel,
    album: video.channel,
    date: format(video.createdAt, "yyyy-MM-dd"),
    publisher: "podtube",
  });
  console.timeEnd("updateAudioID3V2Metadata");

  const updatedAudioBuffer = Buffer.from(
    await readableStreamToArrayBuffer(updateAudioStream),
  );

  console.time("uploadAudioToR2");
  const putObjectCommandOutput = await uploadAudioToR2(
    video.id,
    updatedAudioBuffer,
  );
  console.timeEnd("uploadAudioToR2");

  console.log(`Uploaded audio to R2 bucket.`, putObjectCommandOutput);

  await db.insert(UserVideos).values({
    userId,
    videoId: video.id,
  });

  return c.json(video);
});

app.get("/rss/:username", async (c) => {
  const username = c.req.param("username");

  console.log(`Requested RSS feed for user "${username}"`);

  const user = db.select().from(Users).where(eq(Users.username, username));
  if (!user) {
    throw new HTTPException(404, { message: `User "${username}" not found.` });
  }

  const videos = (
    await db
      .select({
        video: Videos,
      })
      .from(UserVideos)
      .leftJoin(Users, eq(UserVideos.userId, Users.id))
      .leftJoin(Videos, eq(UserVideos.videoId, Videos.id))
      .where(eq(Users.username, username))
      .all()
  )
    .map(({ video }) => video)
    .filter((v) => v !== null);

  const rss = buildRss({
    title: `podtube (for ${username} 🔐)`,
    image: `${BASE_URL}/public/logo.png`,
    author: "podtube",
    description: "Listen to youtube videos as podcasts.",
    link: BASE_URL,
    rssLink: `${BASE_URL}/rss/${username}`,
    pubDate: new Date("2024-06-01"),
    items: videos.map(
      ({
        id,
        title,
        description,
        url,
        duration,
        thumbnail,
        channel,
        length,
        createdAt,
      }) => ({
        title,
        description,
        link: url,
        author: channel,
        pubDate: new Date(createdAt),
        image: `${BASE_URL}/image/${id}.png`,
        audioUrl: `${BASE_URL}/audio/${id}.mp3`,
        duration,
        length,
      }),
    ),
  });

  return new Response(rss, {
    status: 200,
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
});

app.get("/audio/:filename", async (c) => {
  const filename = c.req.param("filename");
  const { name: id, ext } = path.parse(c.req.param("filename"));

  if (!id || (ext && ext !== ".mp3")) {
    throw new HTTPException(400, {
      message: `Invalid audio filename "${filename}". Expected "{videoId}.mp3"`,
    });
  }

  console.log(`Requested audio file for YouTube video ${id}`);

  const range = c.req.header("range");

  const { ContentRange, ContentLength, Body } = await streamAudioFromR2(
    id,
    range,
  );

  if (!Body) {
    throw new HTTPException(404, { message: "Audio stream not available" });
  }

  const stream = Body.transformToWebStream();

  const response = new Response(stream, {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Content-Length": String(ContentLength),
    },
  });

  if (range) {
    response.headers.set("Content-Range", String(ContentRange));
  }

  return response;
});

const IMAGE_SIZE = 1300;

app.get("/image/:filename", async (c) => {
  const filename = c.req.param("filename");
  const { name: id, ext } = path.parse(filename);

  if (!id || (ext && ext !== ".png")) {
    throw new HTTPException(400, {
      message: `Invalid image filename "${filename}". Expected "{videoId}.png"`,
    });
  }

  const [video] = await db.select().from(Videos).where(eq(Videos.id, id));

  const imageResponse = await fetch(video.thumbnail);

  const image = await imageResponse.arrayBuffer();

  const resized = await sharp(image).resize(IMAGE_SIZE, IMAGE_SIZE).toBuffer();

  return new Response(resized, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
    },
  });
});

export default {
  port: PORT,
  fetch: app.fetch,
};
