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

  // Remove stylistic styles if any basic ones (for safety, we assume tailwind only or we just convert basic strings)
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

const teamHtml = fs.readFileSync('src/pages/TeamTemp.html', 'utf-8');
const pricingHtml = fs.readFileSync('src/pages/PricingTemp.html', 'utf-8');

// extract body contents safely
const getBody = (html) => {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
};

let teamBody = getBody(teamHtml);
let pricingBody = getBody(pricingHtml);

teamBody = htmlToJsx(teamBody);
pricingBody = htmlToJsx(pricingBody);

// wrap
const teamComponent = `
import React from 'react';

const Team = () => {
  return (
    <>
      ${teamBody}
    </>
  );
};

export default Team;
`;

const pricingComponent = `
import React from 'react';

const Pricing = () => {
  return (
    <>
      ${pricingBody}
    </>
  );
};

export default Pricing;
`;

fs.writeFileSync('src/pages/Team.jsx', teamComponent);
fs.writeFileSync('src/pages/Pricing.jsx', pricingComponent);
