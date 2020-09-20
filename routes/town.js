const express = require('express');
const router = express.Router();
const towns = require('../db/entity/towns');
const {validationResult, body} = require('express-validator');
const format = require('../helpers/format');
const validators = require('../helpers/validators');

/**
 * Minimum name length for a town.
 *
 * @type {number}
 */
const MIN_TOWN_NAME_LENGTH = 1;

/**
 * Maximum name length for a town.
 *
 * @type {number}
 */
const MAX_TOWN_NAME_LENGTH = 10;

/**
 * town validation rules for existing towns.
 *
 * @type {ValidationChain[]}
 */
const existingTownValidation = [
    body(
        'town-name',
        'Town names must be between ' + MIN_TOWN_NAME_LENGTH + ' and ' + MAX_TOWN_NAME_LENGTH + ' characters long.')
        .trim()
        .isLength({min: MIN_TOWN_NAME_LENGTH, max: MAX_TOWN_NAME_LENGTH}),
    body(
        'town-name',
        'This town name contains a word or phrase not allowed on the site.')
        .trim()
        .custom(validators.badWords),
    body(
        'town-description',
        'Please provide a description of your town.')
        .trim()
        .isLength({min: 3}),
    body(
        'town-description',
        'Your town description contains a word or phrase not allowed on the site.')
        .trim()
        .custom(validators.badWords),
    body(
        'town-address',
        'Dream addresses must be of the form DA-XXXX-YYYY-ZZZZ, where X, Y and Z are all numbers.')
        .trim()
        .matches(/^DA-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]$/),
    body(
        'town-tags',
        'Town tags can only contain letters, numbers and spaces and must not contain profanity.')
        .trim()
        .custom(validators.tagValidator)
];

/**
 * Town validation rules for new towns.
 *
 * @type {ValidationChain[]}
 */
const newTownValidation = [
    body(
        'town-name',
        'You already have a town by that name. Please choose another name.')
        .trim()
        .custom(validators.townExists),
].concat(existingTownValidation);

/**
 * Create or edit town form.
 *
 * @param req
 * @param res
 * @param next
 */
function showTownEditForm(req, res, next) {
    const data = {};
    data.townId = req.params.townId;
    data.pageTitle = req.params.townId ? 'Edit Town' : 'Add New Town';
    data.errors = req.session.errors;
    data.townNameLength = MAX_TOWN_NAME_LENGTH;

    // Previous submission data, if present
    if (req.session.townSubmitData) {
        data.townName = req.session.townSubmitData.townName;
        data.townAddress = req.session.townSubmitData.townAddress;
        data.townDescription = req.session.townSubmitData.townDescription;
        data.townTags = req.session.townSubmitData.townTags;
    }

    // Clear previous submission data
    delete req.session.errors;

    if (res.locals.userState.isRegistered && !req.params.townId) {
        res.render('edit-town', data); // for new towns
    } else if (res.locals.userState.isRegistered && req.params.townId) {
        // For existing towns - make sure it exists first.
        towns.findTownById(req.user.username, req.params.townId)
            .then((town) => {
                if (town) {
                    // Only fill in if not in session already
                    if (!req.session.townSubmitData) {
                        data.townName = town.townName;
                        data.townAddress = town.townAddress;
                        data.townDescription = town.townDescription;
                        data.townTags = town.townTags.join(', ');
                    } else {
                        // Clear for next time
                        delete req.session.townSubmitData;
                    }
                    res.render('edit-town', data);
                } else {
                    // No such town...
                    res.redirect('/user/' + req.user.username);
                }
            }).catch(next);
    } else {
        res.redirect('/login'); // create an account to continue
    }
};

/**
 * Save new or existing town changes.
 * @param req
 * @param res
 * @param next
 */
function saveTown(req, res, next) {
    // Only registered users here.
    if (!res.locals.userState.isRegistered) {
        res.redirect('/');
        return;
    }
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.session.errors = errors.array();
        req.session.townSubmitData = {};
        req.session.townSubmitData.townName = req.body['town-name'];
        req.session.townSubmitData.townAddress = req.body['town-address'];
        req.session.townSubmitData.townDescription = req.body['town-description'];
        req.session.townSubmitData.townTags = req.body['town-tags'];
        if (req.params.townId) {
            res.redirect('/town/edit/' + req.params.townId);
        } else {
            res.redirect('/town/create');
        }
    } else {
        const townName = req.body['town-name'];
        const townAddress = req.body['town-address'];
        const townDescription = req.body['town-description'];
        const townTags = format.splitAndTrim(req.body['town-tags'], ',');
        if (!req.params.townId) {
            // It's a new town
            towns.createTown(req.user.username, format.getSlug(townName), townName, townAddress, townDescription, townTags)
                .then(() => {
                    res.redirect('/user/' + req.user.username);
                })
                .catch(next);
        } else {
            // Existing town
            towns.saveTown(req.user.username, req.params.townId, townName, townAddress, townDescription, townTags)
                .then(() => {
                    res.redirect('/user/' + req.user.username + '/town/' + req.params.townId);
                })
                .catch(next);
        }
    }
};

/**
 * Route for creating a town.
 */
router.get('/create', (req, res, next) => {
    showTownEditForm(req, res, next);
});

/**
 * Route for POSTing new town to the database.
 */
router.post('/create', newTownValidation, (req, res) => {
    saveTown(req, res, next);
});

/**
 * Route for editing a town.
 */
router.get('/edit/:townId', (req, res, next) => {
    showTownEditForm(req, res, next);
});

/**
 * Route for POSTing new data of a town.
 */
router.post('/edit/:townId', existingTownValidation, (req, res, next) => {
    saveTown(req, res, next);
});

/**
 * Route for deleting a town.
 */
router.post('/delete/:townId', (req, res) => {
    if (res.locals.userState.isRegistered) {
        towns.deleteTownById(req.user.username, req.params.townId)
            .then(() => {
                res.status(204).send();
            });
    } else {
        res.status(403).send();
    }
});

module.exports = router;