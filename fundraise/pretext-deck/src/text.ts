// Inline run model + a tiny markdown parser, so slide copy is authored as plain
// strings with **bold** and *italic* and rendered as styled runs.
// Convention: **bold** -> emphasis (indigo, weight 600); *italic* -> italic.

export type Run = {
  text: string;
  em?: boolean;
  italic?: boolean;
};

export function parseInline(input: string): Run[] {
  const runs: Run[] = [];
  let i = 0;
  let buf = '';
  let em = false;
  let italic = false;

  const flush = () => {
    if (buf) runs.push({ text: buf, em: em || undefined, italic: italic || undefined });
    buf = '';
  };

  while (i < input.length) {
    if (input.startsWith('**', i)) {
      flush();
      em = !em;
      i += 2;
      continue;
    }
    // single '*' italic (not part of '**')
    if (input[i] === '*') {
      flush();
      italic = !italic;
      i += 1;
      continue;
    }
    buf += input[i];
    i += 1;
  }
  flush();
  return runs;
}

// Concatenate runs into a flat string (used for headline auto-fit measurement).
export function runsToText(runs: Run[]): string {
  return runs.map((r) => r.text).join('');
}
