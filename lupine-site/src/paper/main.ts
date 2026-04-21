import { layoutPaper, measureAllMath, DEFAULT_LAYOUT, type LayoutElement } from './layout';
import { immiPaper } from './immi-paper';

function renderMath(latex: string, displayMode: boolean): string {
  // @ts-ignore
  const k = window.katex;
  if (!k) return latex;
  try {
    return k.renderToString(latex, { throwOnError: false, displayMode });
  } catch {
    return latex;
  }
}

function createPage(pageIndex: number, elements: LayoutElement[]): HTMLElement {
  const page = document.createElement('div');
  page.style.cssText = `
    position: relative;
    width: ${DEFAULT_LAYOUT.width}px;
    height: ${DEFAULT_LAYOUT.height}px;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    overflow: hidden;
    flex-shrink: 0;
  `;

  const pageEls = elements.filter((e) => e.pageIndex === pageIndex);

  for (const el of pageEls) {
    switch (el.kind) {
      case 'text-line': {
        const span = document.createElement('span');
        span.style.cssText = `
          position: absolute;
          left: ${el.x}px;
          top: ${el.y}px;
          width: ${el.width}px;
          height: ${el.height}px;
          font: ${el.font};
          line-height: ${el.lineHeight}px;
          white-space: nowrap;
          overflow: hidden;
        `;
        span.textContent = el.text;
        page.appendChild(span);
        break;
      }
      case 'math-inline': {
        const span = document.createElement('span');
        span.style.cssText = `
          position: absolute;
          left: ${el.x}px;
          top: ${el.y}px;
          width: ${el.width}px;
          height: ${el.height}px;
          display: flex;
          align-items: center;
        `;
        span.innerHTML = renderMath(el.latex, false);
        page.appendChild(span);
        break;
      }
      case 'heading': {
        const span = document.createElement('span');
        span.style.cssText = `
          position: absolute;
          left: ${el.x}px;
          top: ${el.y}px;
          width: ${el.width}px;
          height: ${el.height}px;
          font: ${el.font};
          line-height: ${el.lineHeight}px;
          white-space: nowrap;
          overflow: hidden;
        `;
        span.textContent = el.text;
        page.appendChild(span);
        break;
      }
      case 'equation': {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute;
          left: ${el.x}px;
          top: ${el.y}px;
          width: ${el.width}px;
          height: ${el.height}px;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        div.innerHTML = renderMath(el.latex, true);
        if (el.number !== undefined) {
          const num = document.createElement('span');
          num.style.cssText = 'position:absolute; right:0; font: 9px "Source Sans 3", sans-serif; color:#666;';
          num.textContent = `(${el.number})`;
          div.appendChild(num);
        }
        page.appendChild(div);
        break;
      }
      case 'figure': {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute;
          left: ${el.x}px;
          top: ${el.y}px;
          width: ${el.width}px;
          height: ${el.height}px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        `;
        const img = document.createElement('img');
        img.src = el.src;
        img.alt = el.caption;
        img.style.cssText = `width: ${el.displayWidth}px; height: ${el.displayHeight}px; object-fit: contain;`;
        div.appendChild(img);
        const cap = document.createElement('span');
        cap.style.cssText = 'font: 8px "Source Sans 3", sans-serif; color: #444; text-align: center; line-height: 10px;';
        cap.innerHTML = (el.label ? `<strong>${el.label}. </strong>` : '') + el.caption;
        div.appendChild(cap);
        page.appendChild(div);
        break;
      }
      case 'table': {
        const div = document.createElement('div');
        div.style.cssText = `
          position: absolute;
          left: ${el.x}px;
          top: ${el.y}px;
          width: ${el.width}px;
          height: ${el.height}px;
        `;
        const cols = el.rows[0]?.length ?? 1;
        const colWidth = el.width / cols;
        const table = document.createElement('table');
        table.style.cssText = 'width:100%; border-collapse:collapse; font: 8px "Source Sans 3", sans-serif;';
        const tbody = document.createElement('tbody');
        for (let ri = 0; ri < el.rows.length; ri++) {
          const tr = document.createElement('tr');
          tr.style.borderBottom = ri === 0 ? '1.5px solid #333' : '0.5px solid #ccc';
          for (let ci = 0; ci < el.rows[ri].length; ci++) {
            const td = document.createElement('td');
            td.style.cssText = `width: ${colWidth}px; padding: 2px 4px; text-align: ${ci === 0 ? 'left' : 'center'};`;
            td.innerHTML = ri === 0 ? `<strong>${el.rows[ri][ci]}</strong>` : el.rows[ri][ci];
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        div.appendChild(table);
        const cap = document.createElement('div');
        cap.style.cssText = 'font: 8px "Source Sans 3", sans-serif; color: #444; margin-top: 4px; text-align: center;';
        cap.innerHTML = (el.label ? `<strong>${el.label}. </strong>` : '') + el.caption;
        div.appendChild(cap);
        page.appendChild(div);
        break;
      }
    }
  }

  return page;
}

async function main() {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element not found');
    return;
  }

  console.log('[paper] starting render');

  // Wait for KaTeX up to 3s
  let katexReady = false;
  for (let i = 0; i < 30; i++) {
    // @ts-ignore
    if (window.katex) { katexReady = true; break; }
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('[paper] katex ready:', katexReady);

  // Measure math
  const mathWidths = katexReady ? measureAllMath(immiPaper) : new Map<string, number>();
  console.log('[paper] math widths:', mathWidths.size);

  // Layout
  const elements = layoutPaper(immiPaper, mathWidths, DEFAULT_LAYOUT);
  console.log('[paper] elements:', elements.length);

  const maxPage = elements.reduce((m, e) => Math.max(m, e.pageIndex), 0);
  console.log('[paper] pages:', maxPage + 1);

  // Clear root and render
  root.innerHTML = '';

  // Print button
  const btnContainer = document.createElement('div');
  btnContainer.className = 'no-print';
  btnContainer.style.cssText = 'position: fixed; top: 16px; right: 16px; z-index: 100;';
  const btn = document.createElement('button');
  btn.textContent = 'Print / Save PDF';
  btn.style.cssText = 'padding: 8px 16px; background: #1a1a1a; color: white; border: none; border-radius: 4px; cursor: pointer; font: 10px "Source Sans 3", sans-serif;';
  btn.onclick = () => window.print();
  btnContainer.appendChild(btn);
  root.appendChild(btnContainer);

  // Pages container
  const pagesContainer = document.createElement('div');
  pagesContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 16px; padding-bottom: 40px;';
  for (let i = 0; i <= maxPage; i++) {
    pagesContainer.appendChild(createPage(i, elements));
  }
  root.appendChild(pagesContainer);

  console.log('[paper] render complete');
}

main().catch((err) => {
  console.error('[paper] fatal error:', err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:40px;color:#c00;font:14px sans-serif">Error: ${err.message}</div>`;
  }
});
