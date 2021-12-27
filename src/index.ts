/** @format */

// - https://umijs.org/plugin/develop.html
import { IApi, utils } from 'umi';
import { join } from 'path';
import serveStatic from 'serve-static';
import rimraf from 'rimraf';
import { mkdirSync, existsSync } from 'fs';

const fs = require('fs');
const winPath = require('slash2');
const LessThemePlugin = require('./lessPlugin/lessThemePlugin');
const generateCssFile = require('./generateCssFile');

const defaultGenerateScopedName = (className: string, filePath: string) => {
  const match = filePath.match(/src(.*)/);
  if (match && match[1]) {
    const basePath = match[1].replace('.less', '');
    const arr = winPath(basePath)
      .split('/')
      .map((a: string) => a.replace(/([A-Z])/g, '-$1'))
      .map((a: string) => a.toLowerCase());
    return `${arr.join('-')}-${className}`.replace(/--/g, '-');
  }
  return className;
}

const defaultOptions = {
  min: true,
  generateScopedName: defaultGenerateScopedName,
}

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

  const { cwd, absOutputPath } = api.paths;
  const outputPath = absOutputPath;
  const themeTemp = winPath(join(cwd, '.temp', '.plugin-theme'));

  let lessThemePlugin = LessThemePlugin();

  // 增加中间件
  api.addMiddewares(() => {
    return serveStatic(themeTemp);
  });
  
  api.modifyConfig((memo) => {
    if (!memo.lessLoader) {
      memo.lessLoader = {};
    }
    if (!memo.lessLoader['plugins']) {
      memo.lessLoader['plugins'] = []
    }
    memo.lessLoader['plugins'].push(lessThemePlugin);
    return memo;
  })

  api.onGenerateFiles(async () => {
    const options = {
      ...defaultOptions,
      ...(api.config.antdThemeGenerator || {})
    };

    if (!options.theme) {
      return;
    }

    lessThemePlugin.setOptions(options);
    
    // 建立相关的临时文件夹
    try {
      const themePath = winPath(join(themeTemp, 'theme'));
      if (existsSync(themePath)) {
        rimraf.sync(themePath);
      }
      mkdirSync(themePath, { recursive: true });
    } catch (error) {
      console.error(error);
    }

    // 初始化css的文件名，文件名中添加时间戳避免缓存问题
    for(const option of options.theme) {
      if (!option.filename) {
        option.filename = `${option.key}.${Date.now()}.css`;
      }
    }

    // 生成exports.ts
    const exportsTpl = join(__dirname, 'templates', 'exports.tpl');
    const exportsContent = fs.readFileSync(exportsTpl, 'utf-8');
    api.writeTmpFile({
      path: 'umi-plugin-antd-theme-generator/exports.ts',
      content: utils.Mustache.render(exportsContent, {
        publicPath: api.env === 'development' ? '/' : (api.config.publicPath || '/'),
        themes: JSON.stringify(options.theme.map(t => ({ key: t.key, filename: t.filename }))),
      }),
    });
  });

  api.onDevCompileDone(async ({ isFirstCompile }) => {
    const options = {
      ...defaultOptions,
      ...(api.config.antdThemeGenerator || {})
    };

    api.logger.info('💄  build theme');

    try {
      const themePath = winPath(join(themeTemp, 'theme'));
      const fileList = lessThemePlugin.getFileList();
      fs.writeFileSync(winPath(join(themeTemp, 'lessFileList.txt')), fileList.join('\n'));
      await generateCssFile(fileList, themePath, options);
    } catch(e) {
      console.error(e);
    }

    api.logger.info(`Theme build successfully`);
  })

  api.onBuildComplete(async ({ err }) => {
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

    api.logger.info('💄  build theme');

    try {
      const fileList = lessThemePlugin.getFileList();
      fs.writeFileSync(winPath(join(themeTemp, 'lessFileList.txt')), fileList.join('\n'));
    
      const themePath = winPath(join(themeTemp, 'theme'));
      await generateCssFile(fileList, themePath, options);
    } catch(e) {
      console.error(e);
    }

    api.logger.info(`Theme build successfully`);

    mkdirSync(winPath(join(outputPath, 'theme')));
    options.theme.forEach(option => {
      fs.copyFileSync(winPath(join(themeTemp, 'theme', option.filename)), winPath(join(outputPath, 'theme', option.filename)));
    })
  })

  api.addUmiExports(() => [
    {
      exportAll: true,
      source: '../umi-plugin-antd-theme-generator/exports',
    },
  ]);
}
