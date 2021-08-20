// Helper Functions

// Change the color of text in the console:
// TODO: Check if config.coloredConsoleOutputs is true
const toRed = (msg: string) => `\x1b[31m${msg}\x1b[0m`;
const toGreen = (msg: string) => `\x1b[32m${msg}\x1b[0m`;
const toYellow = (msg: string) => `\x1b[33m${msg}\x1b[0m`;
const toBlue = (msg: string) => `\x1b[34m${msg}\x1b[0m`;
const toMagenta = (msg: string) => `\x1b[35m${msg}\x1b[0m`;
const toCyan = (msg: string) => `\x1b[36m${msg}\x1b[0m`;



export { toRed, toGreen, toYellow, toBlue, toMagenta, toCyan }
