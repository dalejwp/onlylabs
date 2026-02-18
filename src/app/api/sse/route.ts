import { mcBus } from "@/lib/events";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (data: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({ type: "hello", t: Date.now() });

      const onEvent = (evt: any) => send(evt);
      mcBus.on("event", onEvent);

      const keepAlive = setInterval(() => send({ type: "ping", t: Date.now() }), 15000);

      return () => {
        closed = true;
        clearInterval(keepAlive);
        mcBus.off("event", onEvent);
      };
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
