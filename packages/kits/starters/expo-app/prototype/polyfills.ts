// What MSW needs on a phone and React Native lacks: MSW builds its WebSocket
// support on the browser's MessageEvent and BroadcastChannel when it loads,
// which Hermes does not have (the prototype uses no WebSocket, so stand-ins
// that keep MSW loading are enough), and it copies each pretend answer from
// its `body`, which React Native's Response does not have. Only the prototype loads this file, before
// MSW (see prototype/start.ts). In the browser it is not needed
// (polyfills.web.ts).

type Init = { data?: unknown; origin?: string; lastEventId?: string };

if (!('MessageEvent' in globalThis)) {
  class MessageEvent extends Event {
    readonly data: unknown;
    readonly origin: string;
    readonly lastEventId: string;
    constructor(type: string, init: Init = {}) {
      super(type);
      this.data = init.data;
      this.origin = init.origin ?? '';
      this.lastEventId = init.lastEventId ?? '';
    }
  }
  Object.assign(globalThis, { MessageEvent });
}

// A channel to other browser tabs: a phone app has none, so nothing is sent.
if (!('BroadcastChannel' in globalThis)) {
  class BroadcastChannel extends EventTarget {
    readonly name: string;
    constructor(name: string) {
      super();
      this.name = name;
    }
    postMessage(_message: unknown) {
      // No other tab hears it.
    }
    close() {
      // Nothing to close.
    }
  }
  Object.assign(globalThis, { BroadcastChannel });
}

// React Native's Response (whatwg-fetch) keeps what it was made from in
// _bodyInit and has no `body`; MSW makes the answer the app reads with
// `new Response(answer.body)`. The body given back is what the answer was
// made from (text here), which whatwg-fetch's Response accepts.
if (!('body' in Response.prototype))
  Object.defineProperty(Response.prototype, 'body', {
    get(this: { _bodyInit?: unknown }) {
      return this._bodyInit ?? null;
    },
  });
