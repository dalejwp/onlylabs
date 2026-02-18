import { mcBus } from "@/lib/events";

export async function GET() {
  const encoder = new TextEncoder();

  // These need to be in the outer scope so cancel() can reach them
  let closed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const onEvent = (evt: unknown) => send(evt);

  function send(data: unknown) {
    if (closed) return;
    try {
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      closed = true;
    }
  }

  function cleanup() {
    closed = true;
    if (timer) clearInterval(timer);
    mcBus.off("event", onEvent);
  }

  // ctrl declared here so send() can reference it before the stream starts
  let ctrl!: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller;
      send({ type: "hello", t: Date.now() });
      mcBus.on("event", onEvent);
      timer = setInterval(() => send({ type: "ping", t: Date.now() }), 15000);
    },
    // cancel() is called when the client disconnects — this is the correct cleanup hook
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
