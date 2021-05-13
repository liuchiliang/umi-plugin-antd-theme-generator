/** @format */

// - https://umijs.org/plugin/develop.html
import { IApi, utils } from 'umi';
import { join } from 'path';
import serveStatic from 'serve-static';
import rimraf from 'rimraf';
import { existsSync, mkdirSync } from 'fs';

const fs = require('fs');
const path = require("path");
const crypto = require("crypto");
const glob = require("glob");
const winPath = require('slash2');
const less = require('less');
const postcss = require('postcss');
const syntax = require('postcss-less');
const uglifycss = require('uglifycss');
const flatten = require('lodash.flatten');
const uniqBy = require('lodash.uniqby');
const { generateTheme } = require("./antd-theme-generator");

const defaultGenerateScopedName = (filePath: string, className: string) => {
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

const defaultOptions = {
  min: false,
  generateScopedName: defaultGenerateScopedName,
}

const getLess = (from, content, generateScopedName) => 
  postcss([
    require("./postcss-less-modules")({
      generateScopedName: (className) => generateScopedName(from, className),
    }),
  ])
  .process(content, {
    from,
    syntax,
  })
  .then(result => {
    return result.css;
  });

export default function (api: IApi) {
  api.describe({
    key: 'antdThemeGenerator',
    config: {
      default: {},
      schema(joi) {
        return joi.object({
          theme: joi.array(),
          min: joi.boolean(),
          varFile: joi.string(),
          generateScopedName: joi.func()
        });
      },
      onChange: api.ConfigChangeType.regenerateTmpFiles,
    },
  });

  api.modifyDefaultConfig((config) => {
    config.cssLoader = {
      modules: {
        getLocalIdent: (
          context: {
            resourcePath: string;
          },
          _: string,
          localName: string,
        ) => {
          const generateScopedName = api.config.antdThemeGenerator?.generateScopedName || defaultGenerateScopedName;
          return generateScopedName(context.resourcePath, localName);
        },
      },
    };
    return config;
  });

  const { cwd, absOutputPath, absNodeModulesPath } = api.paths;
  const outputPath = absOutputPath;
  const themeTemp = winPath(join(cwd, '.temp', '.plugin-theme'));

  // 增加中间件
  api.addMiddewares(() => {
    return serveStatic(themeTemp);
  });

  const generateThemeFiles = async (options, themePath) => {
    const stylesDirs = [winPath(join(cwd, 'src'))];
    let styles = [];
    stylesDirs.forEach((s) => {
      styles = styles.concat(glob.sync(path.join(s, "./**/*.less")));
    });

    const contentList = [];
    for(const filePath of styles) {
      const content = fs.readFileSync(filePath).toString();
      const lessContent = await getLess(filePath, content, options.generateScopedName || defaultGenerateScopedName);
      contentList.push(lessContent);
    }

    fs.writeFileSync(winPath(join(themeTemp, 'src.less')), contentList.join('\n'));

    const opts = {
      antDir: winPath(join(absNodeModulesPath, 'antd')),
      stylesDir: themeTemp,
      varFile: options.varFile && winPath(join(cwd, options.varFile)),
      generateOne: true,
      themeVariables: uniqBy(flatten(options.theme.map(o => Object.keys(o.modifyVars)))),
    }

    const css = await generateTheme(opts);
    for(const option of options.theme) {
      await less.render(css, {
        modifyVars: option.modifyVars,
        javascriptEnabled: true,
        filename: winPath(join(themeTemp, 'src.less')),
      })
      .then(out => (options.min ? uglifycss.processString(out.css) : out.css))
      .then(out => {
        const contentHash = crypto.createHash('sha256').update(out).digest('hex');
        const fileName = `${option.key}.${contentHash.substr(0, 8)}.css`;
        option.fileName = fileName;
        fs.writeFileSync(winPath(join(themePath, fileName)), out)
      })
      .catch(e => {
        console.error(e);
      })
    }

    api.logger.info(`Theme build successfully`);
  }

  api.onGenerateFiles(async () => {
    const options = {
      ...defaultOptions,
      ...(api.config.antdThemeGenerator || {})
    };

    if (!options.theme) {
      return;
    }

    api.logger.info('💄  build theme');
    
    try {
      // 建立相关的临时文件夹
      const themePath = winPath(join(themeTemp, 'theme'));
      if (existsSync(themePath)) {
        rimraf.sync(themePath);
      }
      mkdirSync(themePath, { recursive: true });

      await generateThemeFiles(options, themePath);

      const exportsTpl = join(__dirname, 'templates', 'exports.tpl');
      const exportsContent = fs.readFileSync(exportsTpl, 'utf-8');
      api.writeTmpFile({
        path: 'umi-plugin-antd-theme-generator/exports.ts',
        content: utils.Mustache.render(exportsContent, {
          themes: JSON.stringify(options.theme),
        }),
      });

    } catch (error) {
      console.error(error);
    }
  });

  api.onBuildComplete(({ err }) => {
    if (err) {
      return;
    }

    const options = {
      ...defaultOptions,
      ...(api.config.antdThemeGenerator || {})
    };

    if (!options.theme) {
      return;
    }

    mkdirSync(winPath(join(outputPath, 'theme')));
    options.theme.forEach(option => {
      fs.copyFileSync(winPath(join(themeTemp, 'theme', option.fileName)), winPath(join(outputPath, 'theme', option.fileName)));
    })
  })

  api.addUmiExports(() => [
    {
      exportAll: true,
      source: '../umi-plugin-antd-theme-generator/exports',
    },
  ]);
}
