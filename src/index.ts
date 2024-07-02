import { Hono } from "hono";
import { buildRss } from "./rss";
import { serveStatic } from "hono/bun";
import { dowloadAudio, extractMetadata } from "./yt-dlp";
import { HTTPException } from "hono/http-exception";
import { db } from "./db";
import { Users, UserVideos, Videos } from "./db/schema";
import { eq } from "drizzle-orm";

const PORT = process.env.PORT ?? 3000;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

const app = new Hono();

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

  const {
    id,
    title,
    thumbnail,
    description,
    channel,
    duration,
    webpage_url,
    filesize,
  } = await extractMetadata(uri);

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
      length: filesize ?? 0,
    })
    .returning();

  await db.insert(UserVideos).values({
    userId,
    videoId: video.id,
  });

  return c.json(video);
});

app.get("/feed/:username", async (c) => {
  const username = c.req.param("username");

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
      ({ id, title, description, url, duration, thumbnail, channel }) => ({
        title,
        subtitle: "subtitle - todo remove it",
        description,
        link: url,
        pubDate: new Date(),
        audioUrl: `${BASE_URL}/audio/${id}`,
        length: 1000, // TODO
        image: thumbnail,
        author: channel,
        duration,
      }),
    ),
  });

  return new Response(rss, {
    status: 200,
    headers: { "Content-Type": "application/rss+xml" },
  });
});

app.get("/audio/:id", async (c) => {
  const id = c.req.param("id");
  const stream = await dowloadAudio(id);

  return new Response(stream, {
    headers: { "content-type": "audio/mpeg" },
  });
});

export default {
  port: PORT,
  fetch: app.fetch,
};
