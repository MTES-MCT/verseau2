const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Not Found",
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
  console.log(`Health endpoint available at http://localhost:${PORT}/health`);
});

module.exports = server;
