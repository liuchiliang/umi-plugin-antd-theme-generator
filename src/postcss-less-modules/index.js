const postcss = require('postcss');
const path = require('path');
const uniqBy = require('lodash.uniqby');
const genRule = require('./genRule');

/**
 * 便利所有的规则
 * 删除 import
 * 并且返回需要的样式
 * @param {*} less
 * @param {*} callback
 */
const walkRules = (less, callback) => {
  const fileNameList = [];
  less.walkAtRules(atRule => {
    if (atRule.import) {
      const filename = atRule.params;
      if (
        !filename.includes('style/mixins') &&
        !filename.includes('style/themes') &&
        !filename.includes('themes/index') &&
        !filename.includes('color/colors') &&
        !filename.includes('./index') &&
        !filename.includes('index.css')
      ) {
        const importFile = String(atRule.params);
        fileNameList.push(
          path.join(
            path.dirname(less.source.input.file),
            importFile.substring(1, importFile.length - 1),
          ),
        );
      }
      atRule.remove();
    }
  });
  less.walkRules(rule => {
    if (rule.parent.type !== 'atrule' || !/keyframes$/.test(rule.parent.name)) {
      if (rule.selector.indexOf('(') === -1 || rule.selector.includes(':global(')) {
        callback(rule);
      }
    }
  });
  const lessFile = less.source.input.file.split('src/')[1];
  less.prepend(postcss.comment({ text: `\n  Convert to from  src/${lessFile}\n` }));
  return fileNameList;
};

const LocalIdentNamePlugin = postcss.plugin('LocalIdentNamePlugin', options => (less, result) => {
  const fileNameList = walkRules(less, rule => {
    genRule(rule, options, result);
  });
  result.messages = fileNameList;
});

module.exports = LocalIdentNamePlugin;
