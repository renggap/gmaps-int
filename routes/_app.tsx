import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/tokens.css" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
        <title>GMaps Intelligence</title>
      </head>
      <body>
        <Component />
        <script
          dangerouslySetInnerHTML={{
            __html:
              `document.addEventListener('submit',e=>{const b=e.submitter||e.target.querySelector('button[type=submit]');if(b)setTimeout(()=>b.dataset.pending='',0)});`,
          }}
        />
      </body>
    </html>
  );
});
