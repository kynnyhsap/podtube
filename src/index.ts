import { Hono } from "hono";
import { buildRss } from "./rss";
import { serveStatic } from "hono/bun";

const app = new Hono();

const PORT = process.env.PORT ?? 3000;

const BASE_URL = `http://localhost:${PORT}`;

app.use("/", serveStatic({ path: "./public/index.html" }));
app.use("/cover.jpg", serveStatic({ path: "./public/cover.jpg" }));

app.get("/feed", (c) => {
  const username = "andriy";

  const rss = buildRss({
    title: `podtube feed (for ${username})`,
    image: `${BASE_URL}/cover.png`,
    author: "podtube",
    description: "description",
    link: "https://example.com",
    pubDate: new Date(),
    items: [
      {
        title: "Youtube Video Title",
        subtitle: "Subtitle?",
        description: "Youtube Video Description",
        link: "Link to Youtube Video",
        pubDate: new Date(),
        audioUrl: `${BASE_URL}/audio/`,
        length: 1000,
        image: "thumbnail",
        author: "youtube video cahnnel",
      },
    ],
  });

  return new Response(rss, {
    status: 200,
    headers: { "Content-Type": "application/rss+xml" },
  });
});

export default {
  port: BASE_URL,
  fetch: app.fetch,
};
