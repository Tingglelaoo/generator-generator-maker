const chalk = require("chalk");

module.exports = {
  needInstall: false, // 是否需要执行安装依赖
  prompts: [
    {
      type: "confirm",
      name: "needFile",
      message: "need create dummyfile.txt?",
      default: true
    },
    {
      type: "input",
      name: "filename",
      message: "change name for dummyfile.txt",
      default: "dummyfile",
      validate(val) {
        const targetPath = this.destinationPath("./src/page/*/");
        const existedFiles = this.getExistedFiles(targetPath);
        if (existedFiles && existedFiles.indexOf(val) > -1) {
          this.log(chalk.red("filename not valid"));
          return false;
        }

        return true;
      }
    }
  ],
  dirsToCreate: [],
  filesToCopy: [],
  filesToRender: [
    {
      input: "dummyfile.txt",
      // 支持动态输出
      output(answers) {
        return `${answers.filename}.txt`;
      },
      // 支持条件渲染
      when(answers) {
        return answers.needFile;
      },
      // 支持渲染完成回调
      afterRender() {
        this.log(chalk.red("dummyfile.txt is rendered"));
      }
    }
  ]
};
