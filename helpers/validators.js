/**
 * A collection of common validation functions.
 */

/**
 * Format helper.
 */
const format = require('./format');

/**
 * Towns repository.
 *
 * @type {Towns}
 */
const towns = require('../db/entity/towns');

/**
 * Check if a town already exists for a user.
 *
 * @param value
 * @param req
 * @returns {Promise<*>}
 */
function townExists(value, {req}) {
    return towns.findTownById(req.user.username, format.getSlug(value))
        .then((townExists) => {
            if (townExists) {
                return Promise.reject();
            }
        });
}
module.exports.townExists = townExists;

/**
 * Check if all tags are alphanumeric only.
 *
 * @param value
 * @returns {boolean}
 */
function tagValidator(value) {
    const tags = format.splitAndTrim(value, ',');
    for (let t of tags) {
        if (!t.match(/^[A-Za-z0-9][A-Za-z0-9 ]+$/i) || !badWords(t)) {
            return false; // bad tag name!
        }
    }

    return true; // all good
}
module.exports.tagValidator = tagValidator;

/**
 * Checks the input string against a known set of bad words.
 *
 * @param value
 * @returns {boolean}
 */
function badWords(value) {
    return true; // TODO
}
module.exports.badWords = badWords;