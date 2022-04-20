"use strict";
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const Generator = require("yeoman-generator");
const mkdirp = require("mkdirp");
const chalk = require("chalk");
const yosay = require("yosay");
const config = require("./config");

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this._renderData = {}; // 待渲染数据
    this._templateData = null; // 模版数据
    this._afterRenderHandlers = []; // 渲染文件后执行
  }

  _render(input, output, data) {
    if (!data || Object.keys(data).length === 0) {
      this.fs.copy(this.templatePath(input), this.destinationPath(output));
      return;
    }

    this.fs.copyTpl(
      this.templatePath(input),
      this.destinationPath(output),
      data
    );
  }

  _mkdir(dirname, callback) {
    mkdirp(dirname, err => {
      if (err) {
        this.log(`error ${chalk.red(err)}`);
        process.exit();
      }

      this.log(`${chalk.green("create")} ${dirname}`);
      if (callback) {
        callback();
      }
    });
  }

  _getTempalteData() {
    const templateData = {
      ...this.answers,
      username: this.user.git.name(),
      date: new Date().toISOString().split("T")[0]
    };

    return templateData;
  }

  // 简单支持函数属性
  _runObjectFunc(file, params) {
    const doNotRun = ["afterRender"]; // 渲染完成回调
    const transFile = {};
    const keys = Object.keys(file);
    keys.forEach(key => {
      const isFunc = typeof file[key] === "function";
      if (doNotRun.indexOf(key) > -1) {
        transFile[key] = file[key];
        this._afterRenderHandlers.push(file[key]);
      } else {
        transFile[key] = isFunc ? file[key].bind(this)(params) : file[key];
      }
    });

    return transFile;
  }

  // 遍历当前目录，存入目录名用于检查是否同名
  getExistedFiles(targetPath) {
    const existedFiles = [];
    const pageFiles = glob.sync(targetPath);
    const reg = /\/([^/]+)(\/$)/;
    pageFiles.forEach(v => {
      if (v && v.lastIndexOf("/") > -1) {
        existedFiles.push(reg.exec(v)[1]);
      }
    });

    return existedFiles;
  }

  // 检查目录是否存在
  isExist(targetPath) {
    return fs.existsSync(targetPath);
  }

  initializing() {}

  prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the groundbreaking ${chalk.red(
          "generator-generator-maker"
        )} generator!`
      )
    );

    const prompts = config.prompts.map(item => {
      const ques = Object.assign({}, item);
      Object.keys(ques).forEach(key => {
        if (typeof ques[key] === "function") {
          ques[key] = val => {
            const res = item[key].call(this, val);
            return res;
          };
        }
      });
      return ques;
    });

    return this.prompt(prompts).then(answers => {
      this.answers = answers;
    });
  }

  defaults() {
    // 判断工程名同名文件夹是否存在，不存在则自动创建
    const { appName } = this.answers;
    if (appName && path.basename(this.destinationPath()) !== appName) {
      // 设置目标根目录
      this.destinationRoot(this.destinationPath(`src`));
    }
  }

  writing() {
    this.log(`\n\n${chalk.green("initializing...")}\n`);

    this._templateData = this._getTempalteData();

    // 渲染文件
    if (config.filesToRender.length > 0) {
      this._renderData.filesToRender = [];
      config.filesToRender.forEach(file => {
        const { when = true, input, output } = this._runObjectFunc(
          file,
          this._templateData
        );
        if (when) {
          this._render(input, output, this._templateData);
          this._renderData.filesToRender.push({
            input,
            output
          });
        }
      });
    }

    // 拷贝文件
    if (config.filesToCopy.length > 0) {
      this._renderData.filesToCopy = [];
      config.filesToCopy.forEach(file => {
        const { when = true, input, output } = this._runObjectFunc(
          file,
          this._templateData
        );

        if (when) {
          this._render(input, output);
          this._renderData.filesToCopy.push({
            input,
            output
          });
        }
      });
    }

    // 创建空文件夹
    if (config.dirsToCreate.length > 0) {
      this._renderData.filesToCopy = [].concat(config.dirsToCreate);
      const done = this.async();
      config.dirsToCreate.forEach((dirname, index, arr) => {
        this._mkdir(dirname, () => {
          if (index === arr.length - 1) {
            done();
          }
        });
      });
    }

    // 创建结束回调
    this._afterRenderHandlers.forEach(handler => {
      const func = handler.bind(this);
      func(this._templateData);
    });
  }

  install() {
    if (config.needInstall) {
      this.installDependencies();
    }
  }
};
