import type { APIEvent } from "@solidjs/start/server";
import { format } from "date-fns";
import { json } from "@solidjs/router";
import { db } from "~/db";
import { Users, UserVideos, Videos } from "~/db/schema";
import { eq } from "drizzle-orm";

const PORT = process.env.PORT ?? 3000;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export async function GET({ params }: APIEvent) {
  const { username } = params;

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
}

const cData = (s: string) => `<![CDATA[${s}]]>`;

const toRFC2822 = (d: Date) => format(d, "EEE, dd MMM yyyy HH:mm:ss X");

function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 3600);
  const remainingSeconds = duration % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  const formattedMinutes =
    minutes > 0 ? `${hours > 0 ? minutes : minutes}` : "0";

  const formattedSeconds = secs < 10 && minutes > 0 ? `0${secs}` : `${secs}`;

  if (hours > 0) {
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    return `${minutes}:${formattedSeconds}`;
  }
}

export type RssItem = {
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  audioUrl: string;
  length: number;
  image: string;
  author: string;
  duration: number;
};

const buildRssItem = ({
  title,
  description,
  link,
  pubDate,
  audioUrl,
  length,
  image,
  author,
  duration,
}: RssItem) => `<item>
  <title>${title}</title>
  <link>${link}</link>
  <pubDate>${toRFC2822(pubDate)}</pubDate>
  <description>${cData(description)}</description>

  <content:encoded>${cData(description)}</content:encoded>

  <enclosure url="${audioUrl}" length="${length}" type="audio/mpeg"/>

  <dc:creator>${author}</dc:creator>

  <itunes:episodeType>full</itunes:episodeType>
  <itunes:explicit>no</itunes:explicit>
  <itunes:image href="${image}"/>
  <itunes:duration>${formatDuration(duration)}</itunes:duration>
  <itunes:summary>summary</itunes:summary>
  <itunes:author>${author}</itunes:author>
</item>
`;

const keywords = ["youtube", "podtube"];

const buildRss = ({
  title,
  author,
  image,
  description,
  link,
  rssLink,
  pubDate,

  items,
}: {
  image: string;
  title: string;
  author: string;
  description: string;
  link: string;
  rssLink: string;
  pubDate: Date;

  items: RssItem[];
}) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0">
	<channel>
		<title>${title}</title>
		<description>${description}</description>
		<link>${link}</link>
		<pubDate>${toRFC2822(pubDate)}</pubDate>
		<copyright>All rights reserved</copyright>
		<atom:link href="${rssLink}" rel="self" type="application/rss+xml"/>
		<atom:link href="${link}" rel="alternate" type="text/html"/>
		<itunes:author>${author}</itunes:author>
		<itunes:summary>${description}</itunes:summary>
		<itunes:explicit>false</itunes:explicit>
		<language>en</language>
		<itunes:category text="Technology"/>
		<itunes:image href="${image}"/>
		<itunes:owner>
			<itunes:name>${author}</itunes:name>
			<itunes:email>tobirawork@gmail.com</itunes:email>
		</itunes:owner>
		<itunes:keywords>${keywords.join(", ")}</itunes:keywords>
		<podcast:funding>It's free!</podcast:funding>
		<podcast:person role="host" href="${link}">${author}</podcast:person>
		${items.map(buildRssItem).join("\n")}
	</channel>
</rss>
`;
