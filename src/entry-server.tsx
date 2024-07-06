// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          <link
            href="https://fonts.cdnfonts.com/css/jetbrains-mono"
            rel="stylesheet"
          />

          {assets}
        </head>

        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));