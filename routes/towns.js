/**
 *
 * @type {createApplication}
 */
const express = require('express');

/**
 * Sanitizer.
 */
const sanitize = require('../helpers/sanitize');

/**
 *
 * @type {Router}
 */
const router = express.Router();

/**
 * Main page renderer.
 * @param req
 * @param res
 * @param next
 */
function callBrowser(req, res, next) {
    const pageNumber = req.params ? req.params.pageNumber : undefined;
    const pageNumberInt = sanitize.parsePositiveInteger(pageNumber);

    const data = {};
    data.pageTitle = 'Dream Towns';
    data.pageDescription = 'Search for the best dreams to visit at VillagerDB';
    data.pageNumber = pageNumberInt;
    data.searchQuery = req.query.q ? req.query.q : '';
    res.render('towns/browser', data);
}

router.get('/', (req, res, next) => {
    callBrowser(req, res, next);
});

router.get('/page/:pageNumber',  (req, res, next) => {
    callBrowser(req, res, next);
});

/**
 * Actual worker endpoint called by React component.
 */
router.get('/ajax', (req, res, next) => {
    
});
module.exports = router;