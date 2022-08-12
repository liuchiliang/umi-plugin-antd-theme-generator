import fs from 'fs';
const convertLess = require('../convertLess');

async function generateThemeCss(filePath, options) {
  if (!options) {
    return;
  }
  
  for(const option of options.theme) {
    const filename = filePath.split('?')[0];
    const fileContent = fs.readFileSync(filename).toString();

    const content = await convertLess(fileContent, {
      filename,
      modifyVars: option.modifyVars,
      scopeBehaviour: filePath.endsWith('?modules') ? 'local' : 'global',
      generateScopedName: options.generateScopedName,
    });

    if (!option.contentMap) {
      option.contentMap = {}
    }

    const contentMap = option.contentMap;
    contentMap[filePath] = content;
  }
}

const LessThemePlugin = (opt) => {
  let options = opt;
  let fileList = [];
  return {
    install: function (less, pluginManager) {
      // pluginManager.addPreProcessor({
      //   process: (src, extra) => {
      //     fileList.push(extra.fileInfo.filename);
      //     return src;
      //   },
      // });
      pluginManager.addPostProcessor({
        process: (css, extra) => {
          const filePath = extra.imports.rootFilename;
          if(!fileList.includes(filePath)) {
            fileList.push(filePath);
          }

          generateThemeCss(filePath, options);

          return css;
        },
      });
    },
    setOptions: function(opt) {
      options = opt;
    },
    getFileList: function () {
      fileList = fileList.filter(filePath => {
        const exists = fs.existsSync(filePath.split('?')[0]);
        if (!exists && options) {
          for(const option of options.theme) {
            delete option.contentMap[filePath];
          }
        }
        return exists;
      });
      return fileList;
    },
    setFileList: function (list) {
      fileList = list;
    },
  };
};

module.exports = LessThemePlugin;
