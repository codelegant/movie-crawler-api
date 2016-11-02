const chalk = require('chalk');
const error = msg=>console.log(chalk.red(msg));
const warn = msg=>console.log(chalk.yellow(msg));
const info = msg=>console.log(chalk.blue(msg));
const success = msg=>console.log(chalk.green(msg));

module.exports = {
  error,
  warn,
  info,
  success
};