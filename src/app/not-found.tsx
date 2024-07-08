export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-16 my-16">
      <img alt="confused.gif" height={300} width={300} src="/confused.gif" />

      <h1 className="text-4xl font-bold">404</h1>

      <a href="/">Back to the app</a>
    </div>
  );
}
