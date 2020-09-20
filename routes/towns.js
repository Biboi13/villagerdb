/**
 *
 * @type {createApplication}
 */
const express = require('express');

/**
 *
 * @type {Router}
 */
const router = express.Router();

function callBrowser(req, res, next) {
    const data = {};
    data.pageTitle = 'Dream Towns';
    data.pageDescription = 'Search for the best dreams to visit at VillagerDB';
    res.render('towns/browser', data);
}

router.get('/', function (req, res, next) {
    callBrowser(req, res, next);
});

router.get('/page/:pageNumber', function (req, res, next) {
    callBrowser(req, res, next);
});

module.exports = router;