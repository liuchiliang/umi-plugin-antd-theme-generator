import { join } from 'path';

const fs = require('fs');
const winPath = require('slash2');
const crypto = require("crypto");
const postcss = require("postcss");

async function generateCssFile(fileList, outputPath, options) {
  for(const option of options.theme) {
    const contentList = [];

    for(const filePath of fileList) {
      const content = option.contentMap && option.contentMap[filePath];
      if (content) {
        contentList.push(content);
      }
    }

    let css = contentList.join('\n');
    
    if (options.min) {
      css = await postcss([
        require('cssnano')({
          "preset": [
            "default",
            options.cssnano || { mergeRules: false, minifyFontValues: { removeQuotes: false } }
          ]
        })
      ])
      .process(css, { from: outputPath })
      .then(out => out.css);
    }

    const filename = option.filename || `${option.key}.${crypto.createHash('sha256').update(css).digest('hex').substr(0, 8)}.css`;
    option.filename = filename;
    fs.writeFileSync(winPath(join(outputPath, filename)), css)
  }
}

module.exports = generateCssFile;