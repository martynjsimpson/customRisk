import { createServer } from "node:http";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = createServer((request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      data: {
        service: "custom-risk-backend",
        status: "bootstrapped",
        path: request.url
      }
    })
  );
});

server.listen(port, () => {
  console.log(`Custom Risk backend listening on port ${port}`);
});
