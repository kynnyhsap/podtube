import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <div class="flex flex-col items-center justify-center gap-16 my-16">
      <img alt="confused.gif" height={300} width={300} src="/confused.gif" />

      <h1 class="text-4xl font-bold">404</h1>

      <A href="/">Back to the app</A>
    </div>
  );
}
