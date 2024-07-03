import { Hono } from "hono";
import { logger } from "hono/logger";
import { buildRss } from "./rss";
import { serveStatic } from "hono/bun";
import { HTTPException } from "hono/http-exception";
import { db } from "./db";
import { Users, UserVideos, Videos } from "./db/schema";
import { eq } from "drizzle-orm";
import { extractMetadata } from "./extract-metadata";
import { dowloadAudio } from "./download-audio";
import { uploadAudio } from "./upload-audio";
import { streamAudio } from "./stream-audio";

const PORT = process.env.PORT ?? 3000;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

const app = new Hono();

app.use(logger());

app.use("/", serveStatic({ path: "./public/index.html" }));

app.use(`/public/*`, serveStatic({ root: `.` }));

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

  const buff = Buffer.from(await new Response(audioStream).arrayBuffer());

  console.time("uploadAudio");
  const putObjectCommandOutput = await uploadAudio(video.id, buff);
  console.timeEnd("uploadAudio");

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
    pubDate: new Date(),
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
      }) => ({
        title,
        description,
        link: url,
        pubDate: new Date(),
        image: thumbnail,
        author: channel,
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
  const filename = c.req.param("finename");

  const id = filename?.split(".")[0];

  if (!id) {
    throw new HTTPException(400, {
      message: `Invalid audio filename "${filename}". Expected "{video-id}.mp3"`,
    });
  }

  console.log(`Requested audio file for YouTube video ${id}`);

  const range = c.req.header("range");

  if (range) {
    const { ContentRange, ContentLength, Body } = await streamAudio(id, range);

    return new Response(Body?.transformToWebStream(), {
      status: 206,
      headers: {
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Content-Length": String(ContentLength),
        "Content-Range": String(ContentRange),
      },
    });
  }

  const { ContentLength, Body } = await streamAudio(id);

  return new Response(Body?.transformToWebStream(), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Content-Length": String(ContentLength),
    },
  });
});

export default {
  port: PORT,
  fetch: app.fetch,
};
