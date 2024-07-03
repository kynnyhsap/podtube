import { Hono } from "hono";
import { logger } from "hono/logger";
import { buildRss } from "./rss";
import { serveStatic } from "hono/bun";
import { extractMetadata } from "./yt-dlp";
import { HTTPException } from "hono/http-exception";
import { db } from "./db";
import { Users, UserVideos, Videos } from "./db/schema";
import { eq } from "drizzle-orm";

const PORT = process.env.PORT ?? 3000;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

const app = new Hono();

app.use(logger());

app.use("/", serveStatic({ path: "./public/index.html" }));

app.use("/cover.jpg", serveStatic({ path: "./public/cover.jpg" }));

app.post("/add", async (c) => {
  const userId = "andrew"; // TODO: get from auth

  const { uri } = await c.req.json<{ uri?: string }>();
  if (!uri) {
    throw new HTTPException(400, {
      message: "Youtube video URI is missing from request body.",
    });
  }

  console.log(`Adding YouTube video ${uri} for user ${userId}.`);

  console.time("extractMetadata");
  const {
    id,
    title,
    thumbnail,
    description,
    channel,
    duration,
    webpage_url,
    filesize,
    filesize_approx,
    url,
  } = await extractMetadata(uri);
  console.time("extractMetadata");

  console.log(`Extracted YouTube video ${id} metadata:`, {
    id,
    title,
    thumbnail,
    description,
    channel,
    duration,
    webpage_url,
    url,
    filesize,
    filesize_approx,
  });

  const [video] = await db
    .insert(Videos)
    .values({
      id,

      title,
      thumbnail,
      description,
      channel,

      url: webpage_url,

      duration: Math.round(duration) ?? 0,
      length: filesize ?? filesize_approx ?? 0,
    })
    .returning();

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
    image: `${BASE_URL}/cover.png`,
    author: "podtube",
    description: "Listen to youtube videos as podcasts.",
    link: BASE_URL,
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
        audioUrl: `${BASE_URL}/audio/${id}`,
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

app.get("/audio/:id", async (c) => {
  const id = c.req.param("id");

  console.log(`Requested audio file for YouTube video ${id}`);

  console.log(`Request headers:`, c.req.raw.headers);

  const { url } = await extractMetadata(id);

  return fetch(url);
});

export default {
  port: PORT,
  fetch: app.fetch,
};
