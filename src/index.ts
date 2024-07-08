import { Hono } from "hono";
import path from "path";
import { launchJob } from "./queue";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { basicAuth } from "hono/basic-auth";
import { db } from "./db";
import { Users, UserVideos, Videos } from "./db/schema";
import sharp from "sharp";
import { NotFound } from "./app/not-found";
import { Layout } from "./app/layout";
import { Home } from "./app/home";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME, r2client } from "./r2";
import { desc, eq } from "drizzle-orm";
import { buildRss } from "./rss";
import { extract } from "./extract";

const PORT = process.env.PORT ?? 3000;

const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

const app = new Hono();

app.use(logger());

const authMiddleware = basicAuth({
  verifyUser: async (username, password, c) => {
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.username, username));

    return !!user;
  },
});

app.get("/", authMiddleware, async (c) => {
  const { uri } = c.req.query();
  const videos = await db
    .select()
    .from(Videos)
    .orderBy(desc(Videos.createdAt))
    .all();

  return c.html(
    Layout({
      children: Home({ videos, uri }),
    }),
  );
});

app.post("/extract", authMiddleware, async (c) => {
  const userId = "andrew";

  const { uri } = (await c.req.json()) as { uri: string };

  const result = await extract(uri, userId);

  return c.json(result);
});

app.get("/audio/:filename", async (c) => {
  const { filename } = c.req.param();

  const { name: id, ext } = path.parse(filename);

  if (!id || (ext && ext !== ".mp3")) {
    return new Response(
      `Invalid audio filename "${filename}". Expected "{videoId}.mp3"`,
      { status: 400 },
    );
  }

  console.log(`Requested audio file for YouTube video "${id}"`);

  const range = c.req.header("range") ?? undefined;

  const { ContentRange, ContentLength, Body } = await r2client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: id,
      Range: range,
    }),
  );

  if (!Body) {
    return new Response("Audio stream not available", { status: 404 });
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
  const { filename } = c.req.param();

  const { name: id, ext } = path.parse(filename);

  if (!id || (ext && ext !== ".png")) {
    return new Response(
      `Invalid image filename "${filename}". Expected "{videoId}.png"`,
      { status: 400 },
    );
  }

  const [video] = await db.select().from(Videos).where(eq(Videos.id, id));

  const imageResponse = await fetch(video.thumbnail);

  const image = await imageResponse.arrayBuffer();

  const resized = await sharp(image)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: "contain" })
    .png()
    .toBuffer();

  return new Response(resized, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
    },
  });
});

app.get("/rss/:username", async (c) => {
  const { username } = c.req.param();

  console.log(`Requested RSS feed for user "${username}"`);

  const user = db.select().from(Users).where(eq(Users.username, username));
  if (!user) {
    return new Response(`User "${username}" not found.`, { status: 404 });
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
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
});

app.get("/*", serveStatic({ root: "./public" }));

app.get("/queue", async (c) => {
  await launchJob("48jlHaxZnig");

  return c.text("Job launched!");
});

app.get("/*", (c) => c.html(Layout({ children: NotFound() })));

export default app;
