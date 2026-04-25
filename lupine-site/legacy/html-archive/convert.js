import fs from 'fs';

function htmlToJsx(html) {
  let jsx = html;
  
  // Basic replacements
  jsx = jsx.replace(/class=/g, 'className=');
  jsx = jsx.replace(/for=/g, 'htmlFor=');
  jsx = jsx.replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
  
  // Svg attrs
  jsx = jsx.replace(/stroke-width/g, 'strokeWidth');
  jsx = jsx.replace(/stroke-linecap/g, 'strokeLinecap');
  jsx = jsx.replace(/stroke-linejoin/g, 'strokeLinejoin');
  jsx = jsx.replace(/fill-rule/g, 'fillRule');
  jsx = jsx.replace(/clip-rule/g, 'clipRule');
  jsx = jsx.replace(/stroke-miterlimit/g, 'strokeMiterlimit');

  // Self closing
  jsx = jsx.replace(/<img(.*?)>/g, (match, attrs) => {
    if (match.endsWith('/>')) return match;
    return `<img${attrs} />`;
  });
  jsx = jsx.replace(/<input(.*?)>/g, (match, attrs) => {
    if (match.endsWith('/>')) return match;
    return `<input${attrs} />`;
  });
  jsx = jsx.replace(/<br(.*?)>/g, (match, attrs) => {
    if (match.endsWith('/>')) return match;
    return `<br${attrs} />`;
  });
  jsx = jsx.replace(/<hr(.*?)>/g, (match, attrs) => {
    if (match.endsWith('/>')) return match;
    return `<hr${attrs} />`;
  });

  jsx = jsx.replace(/style="([^"]*)"/g, (match, styleString) => {
    const styles = styleString.split(';').filter(s => s.trim().length > 0);
    const styleObj = {};
    styles.forEach(s => {
      const parts = s.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
        const value = parts[1].trim();
        styleObj[key] = value;
      }
    });
    return `style={${JSON.stringify(styleObj)}}`;
  });

  return jsx;
}

const inFile = process.argv[2];
const outFile = process.argv[3];
const compName = process.argv[4];

console.log(`Converting ${inFile} into ${outFile} as ${compName}`);

const html = fs.readFileSync(inFile, 'utf-8');

const getBody = (html) => {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
};

let bodyStr = getBody(html);
bodyStr = htmlToJsx(bodyStr);

const componentStr = `
import React from 'react';

const ${compName} = () => {
  return (
    <>
      ${bodyStr}
    </>
  );
};

export default ${compName};
`;

fs.writeFileSync(outFile, componentStr);
console.log('Done!');
