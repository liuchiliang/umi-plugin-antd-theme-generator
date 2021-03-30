<!-- @format -->

# umi-plugin-antd-theme-generator

[![NPM version](https://img.shields.io/npm/v/umi-plugin-antd-theme-generator.svg?style=flat)](https://npmjs.org/package/umi-plugin-antd-theme-generator) [![NPM downloads](http://img.shields.io/npm/dm/umi-plugin-antd-theme-generator.svg?style=flat)](https://npmjs.org/package/umi-plugin-antd-theme-generator)

- Use [antd-theme-generator](https://www.npmjs.com/package/antd-theme-generator) to generate antd theme css file.
- Use `LocalIdentNamePlugin` in [antd-pro-merge-less](https://github.com/chenshuai2144/antd-pro-merge-less) to process css module.

## Usage

Configure in `config/theme.config.js`,

```js
module.exports = {
  theme: [
    {
      key: 'dust',
      modifyVars: {
        '@primary-color': '#F5222D',
      },
    },
    {
      key: 'volcano',
      modifyVars: {
        '@primary-color': '#FA541C',
      },
    },
  ],
  // compress css
  min: true,
  // css module
  generateScopedName： (filePath: string, className: string) => {
    if (
      filePath.includes('node_modules') ||
      filePath.includes('ant.design.pro.less') ||
      filePath.includes('global.less')
    ) {
      return className;
    }
    const match = filePath.match(/src(.*)/);
    if (match && match[1]) {
      const antdProPath = match[1].replace('.less', '');
      const arr = winPath(antdProPath)
        .split('/')
        .map((a: string) => a.replace(/([A-Z])/g, '-$1'))
        .map((a: string) => a.toLowerCase());
      return `antd-pro${arr.join('-')}-${className}`.replace(/--/g, '-');
    }
    return className;
  }
}
```

## How to change theme

```js
import { changeTheme } from 'umi';

changeTheme("dust");
```

## LICENSE

MIT
