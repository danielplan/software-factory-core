// A pretend program for the launcher's tests. Usage: fake-program.ts <mode> <port> [more…]
//   serve: answers every address with 200 ("ok") and prints what it was given
//   listen: accepts connections on the port, answers nothing useful
//   crash: prints "boom" and stops with an error
//   hang:  runs but never answers
//   fail:  prints "step failed" and stops with an error (a failing step)
//   done:  prints "step done" and stops normally (a step that works)
//   later: crashes after a moment
import { createServer as createHttp } from "node:http";
import { createServer as createTcp } from "node:net";

const [mode, port = "0"] = process.argv.slice(2);
if (mode === "serve") {
  createHttp((_request, response) => {
    response.end("ok");
  }).listen(Number(port), "127.0.0.1", () => {
    console.log(
      `listening on ${port} ${process.argv.slice(4).join(" ")} ${process.env["GREETING"] ?? ""}`,
    );
  });
} else if (mode === "listen") {
  createTcp(() => undefined).listen(Number(port), "127.0.0.1");
} else if (mode === "crash") {
  console.error("boom");
  process.exit(1);
} else if (mode === "hang") {
  setInterval(() => undefined, 1000);
} else if (mode === "fail") {
  console.error("step failed");
  process.exit(2);
} else if (mode === "later") {
  setTimeout(() => {
    console.error("gave up");
    process.exit(3);
  }, 2500);
} else {
  console.log("step done");
}
