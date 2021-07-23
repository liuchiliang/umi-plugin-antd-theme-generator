const fs = require("fs");
const path = require("path");

const LOCAL_START = ':local {\n';

async function combineLess(filePath, options) {
  const fileContent = fs.readFileSync(filePath.split('?')[0]).toString();
  const directory = path.dirname(filePath.split('?')[0]);

  const newContent = [];

  for(const line of fileContent.split("\n")) {
    try {
      if (line.startsWith("@import")) {
        let importPath = line.match(/@import\ ["'](.*)["']/)[1];
        let newPath = path.join(directory, importPath);

        if (importPath.startsWith("~")) {
          importPath = importPath.replace("~", "");
          newPath = path.join(options.nodeModulesPath, `./${importPath}`);
        }
  
        if (!newPath.endsWith(".less")) {
          if (fs.existsSync(newPath + ".less")) {
            newPath += ".less";
          } else if (fs.existsSync(newPath + "index.less")){
            newPath += "index.less";
          } else {
            console.error(`File ${newPath} does not exist.`);
            continue;
          }
        }
  
        if (options.cssIndexMap[newPath] == null) {
          options.cssIndexMap[newPath] = filePath;
          const content = await combineLess(newPath, options);
          newContent.push(content);
        }
      } else {
        newContent.push(line);
      }
    } catch(e) {
      console.error(e)
    }
  }

  return `/*${filePath}*/\n${newContent.join('\n')}`
}

module.exports = combineLess;