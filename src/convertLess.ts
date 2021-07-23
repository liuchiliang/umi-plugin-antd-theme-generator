const less = require("less");
const postcss = require("postcss");
const NpmImportPlugin = require("less-plugin-npm-import");
//const lessRemovePlugin = require('./lessPlugin/lessRemovePlugin');

async function convertLess(fileContent, { filename, modifyVars, scopeBehaviour, generateScopedName }) {
  return await less.render(fileContent, {
    modifyVars,
    javascriptEnabled: true,
    filename,
    plugins: [
      new NpmImportPlugin({prefix: '~'}),
      //lessRemovePlugin
    ]
  })
  .then(out => {
    if (scopeBehaviour === 'local') {
      return postcss([
        require("postcss-modules")({
          generateScopedName,
          getJSON: () => {}, // avoid to output json file.
        })
      ])
      .process(out.css, { from: filename })
    }
    return out.css;
  })
  .catch(e => {
    console.error(e);
  });
}

module.exports = convertLess;