/** Renders dictionary prose: blank lines split blocks, "- " lines make a list, "1. " lines make steps. */
export function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-7 text-foreground/85">
      {text.split("\n\n").map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 ps-5 marker:text-muted-foreground">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return (
            <ol key={i} className="list-decimal space-y-1.5 ps-5 marker:font-semibold marker:text-primary">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\d+\. /, "")}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}
