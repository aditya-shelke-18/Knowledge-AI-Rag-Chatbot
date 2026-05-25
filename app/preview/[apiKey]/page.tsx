export default function PreviewPage({ params }: { params: { apiKey: string } }) {
  return (
    <html>
      <head>
        <title>Chatbot Preview</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body { margin: 0; min-height: 100vh; background: linear-gradient(135deg, #1e1b4b, #4c1d95, #1e293b);
            display: flex; align-items: center; justify-content: center; font-family: sans-serif; }
          .card { text-align: center; color: rgba(255,255,255,0.6); }
          .card h1 { color: white; font-size: 1.5rem; margin-bottom: 8px; }
          .card p { font-size: 0.875rem; }
          .badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px;
            background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.3);
            color: #a78bfa; padding: 6px 14px; border-radius: 999px; font-size: 0.75rem; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <h1>Chatbot Preview</h1>
          <p>Your chatbot widget is loaded in the bottom-right corner.</p>
          <div className="badge">
            <span>●</span> Live Preview
          </div>
        </div>
        <script
          src="/chatbot-widget.js"
          data-api-key={params.apiKey}
          async
        />
      </body>
    </html>
  );
}
