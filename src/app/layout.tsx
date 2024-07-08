export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>podtube</title>

        <script src="https://cdn.tailwindcss.com"></script>

        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
          rel="stylesheet"
        ></link>

        <script type="module" src="client.js"></script>
      </head>

      <body
        class="bg-black text-white"
        style={{ fontFamily: "JetBrains Mono" }}
      >
        {children}
      </body>
    </html>
  );
}
