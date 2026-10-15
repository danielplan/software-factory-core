// Small questions to the network: does an address answer, is a port taken.

import { connect } from "node:net";

export async function answers(url: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    });
    await response.body?.cancel();
    return response.status < 400;
  } catch {
    return false;
  }
}

// True when something accepts connections on the port, whatever it is.
export async function portTaken(
  port: number,
  host = "127.0.0.1",
  timeoutMs = 1000,
): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = connect({ port, host });
    const done = (taken: boolean) => {
      socket.destroy();
      resolve(taken);
    };
    socket.setTimeout(timeoutMs, () => {
      done(false);
    });
    socket.once("connect", () => {
      done(true);
    });
    socket.once("error", () => {
      done(false);
    });
  });
}
