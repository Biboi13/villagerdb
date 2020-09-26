const Handlebars = require('handlebars'); // TODO: Don't like. Not in package.json. Refactor some day.

/**
 * Line breaker with safely-escaped strings.
 *
 * @param text
 * @returns {Handlebars.SafeString}
 */
function breakLines(text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Handlebars.SafeString(text);
}
module.exports.breakLines = breakLines;