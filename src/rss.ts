import { format } from "date-fns";

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
  subtitle: string;
  link: string;
  pubDate: Date;
  audioUrl: string;
  length: number;
  image: string;
  author: string;
  duration: number;
};

// TODO: add chapters <podcast:chapters url="${chaptersUrl}" type="application/json+chapters"/>
const buildRssItem = ({
  title,
  subtitle,
  description,
  link,
  pubDate,
  audioUrl,
  length,
  image,
  author,
  duration,
}: RssItem) => `
<item>
    <title>${title}</title>
    <description>${description}</description>
    <link>${link}</link>
    <pubDate>${toRFC2822(pubDate)}</pubDate>

    <enclosure url="${audioUrl}" length="${length}" type="audio/mpeg"/>

    <dc:creator>${author}</dc:creator>

    <itunes:episodeType>full</itunes:episodeType>
	  <itunes:explicit>no</itunes:explicit>
    <itunes:image href="${image}"/>
    <itunes:subtitle>${subtitle}</itunes:subtitle>
	  <itunes:duration>${formatDuration(duration)}</itunes:duration>
    <itunes:summary>${""}</itunes:summary>
    <itunes:author>${author}</itunes:author>
</item>
`;

const keywords = ["youtube", "podtube"];

export const buildRss = ({
  title,
  author,
  image,
  description,
  link,
  pubDate,

  items,
}: {
  image: string;
  title: string;
  author: string;
  description: string;
  link: string;
  pubDate: Date;

  items: RssItem[];
}) => `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0">
	<channel>
		<title>${title}</title>
		<description>${description}</description>
		<link>${link}</link>
		<pubDate>${toRFC2822(pubDate)}</pubDate>
		<copyright>All rights reserved</copyright>
		<itunes:author>${author}</itunes:author>
		<itunes:summary>${""}</itunes:summary>
		<itunes:explicit>no</itunes:explicit>
		<itunes:image href="${image}"/>
		<itunes:owner>
			<itunes:name>${author}</itunes:name>
		</itunes:owner>
		<itunes:keywords>${keywords.join(", ")}</itunes:keywords>
		${items.map(buildRssItem).join("")}
	</channel>
</rss>
`;
