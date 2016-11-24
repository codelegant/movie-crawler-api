const chalk = require('chalk');
const error = msg => console.error(chalk.red(msg));
const warn = msg => console.warn(chalk.yellow(msg));
const info = msg => console.info(chalk.blue(msg));
const success = msg => console.log(chalk.green(msg));

module.exports = {
  error,
  warn,
  info,
  success,
}; 