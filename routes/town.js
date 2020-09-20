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
 * town validation rules for submission.
 *
 * @type {ValidationChain[]}
 */
const townValidation = [
    body(
        'town-name',
        'Town names must be between ' + MIN_TOWN_NAME_LENGTH + ' and ' + MAX_TOWN_NAME_LENGTH + ' characters long.')
        .trim()
        .isLength({min: MIN_TOWN_NAME_LENGTH, max: MAX_TOWN_NAME_LENGTH}),
    body(
        'town-name',
        'You already have a town by that name. Please choose another name.')
        .trim()
        .custom(validators.townExists),
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
        .matches(/^DA-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]$/g),
    body(
        'town-tags',
        'Town tags can only contain letters, numbers and spaces and must not contain profanity.')
        .trim()
        .custom(validators.tagValidator)
];

/**
 * Route for creating a town.
 */
router.get('/create', (req, res, next) => {
    const data = {};
    data.pageTitle = 'Add New Town';
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
    delete req.session.townSubmitData;

    if (res.locals.userState.isRegistered) {
        res.render('edit-town', data);
    } else {
        res.redirect('/login'); // create an account to continue
    }
});

/**
 * Route for POSTing new town to the database.
 */
router.post('/create', townValidation, (req, res) => {
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
        req.session.townSubmitData.townTags = format.splitAndTrim(req.body['town-tags'], ',');
        res.redirect('/town/create');
    } else {
        const townName = req.body['town-name'];
        const townAddress = req.body['town-address'];
        const townDescription = req.body['town-description'];
        const townTags = format.splitAndTrim(req.body['town-tags'], ',');
        towns.createTown(req.user.username, format.getSlug(townName), townName, townAddress, townDescription, townTags)
            .then(() => {
                res.redirect('/user/' + req.user.username);
            })
    }
});

/**
 * Route for editing a town.
 */
router.get('/edit/:townId', (req, res, next) => {
    const data = {}
    data.pageTitle = 'Edit Town';
    data.townId = req.params.townId;
    data.errors = req.session.errors;
    data.townNameLength = MAX_TOWN_NAME_LENGTH;
    delete req.session.errors;

    if (res.locals.userState.isRegistered) {
        // Make sure the town exists.
        towns.findTownById(req.user.username, req.params.townId)
            .then((town) => {
                if (town) {
                    data.townName = town.name;
                    data.townAddress = town.townAddress;
                    data.townDescription = town.townDescription;
                    data.townTags = town.townTags.join(', ');
                    res.render('edit-town', data);
                } else {
                    // No such town...
                    res.redirect('/user/' + req.user.username);
                }
            }).catch(next);
    } else {
        res.redirect('/login'); // create an account to continue
    }
});

/**
 * Route for POSTing new data of a town.
 */
router.post('/edit/:townId', townValidation, (req, res, next) => {
    // Only registered users here.
    if (!res.locals.userState.isRegistered) {
        res.status(403).send();
        return;
    }

    const townId = req.params.townId;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        req.session.errors = errors.array();
        res.redirect('/town/edit/' + townId);
    } else {
        const newTownName = req.body['town-name'];
        const newTownAddress = req.body['town-address'];
        const newTownDescription = req.body['town-description'];
        const newTownTags = format.splitAndTrim(req.body['town-tags'], ',');
        towns.saveTown(req.user.username, townId, newTownName, newTownAddress, newTownDescription, newTownTags)
            .then(() => {
                res.redirect('/user/' + req.user.username + '/town/' + townId);
            })
            .catch(next);
    }
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