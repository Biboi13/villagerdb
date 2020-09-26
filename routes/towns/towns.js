/**
 *
 * @type {createApplication}
 */
const express = require('express');

/**
 * Sanitizer.
 */
const sanitize = require('../../helpers/sanitize');

/**
 * Format helpers
 */
const format = require('../../helpers/format');

/**
 * ElasticSearch
 * @type {es.Client}
 */
const es = require('../../db/elasticsearch');

/**
 * Cache system
 */
const cache = require('../../db/cache');

/**
 * Search configuration
 */
const searchConfig = require('../../config/search.js');

/**
 * Number of towns per page.
 *
 * @type {number}
 */
const PAGE_SIZE = 1;

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
    data.pageTitle = 'Dream Directory';
    data.pageDescription = 'Search for the best dreams to visit at VillagerDB';
    data.pageNumber = pageNumberInt;
    data.searchQuery = req.query.q ? req.query.q : '';
    res.render('towns/browser', data);
}

/**
 * AJAX workhorse the React code talks to.
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise<{}>}
 */
async function doAjax(req, res, next) {
    const indexName = await cache.get(searchConfig.TOWN_INDEX_NAME);
    const pageNumber = req.params ? req.params.pageNumber : undefined;
    const pageNumberInt = sanitize.parsePositiveInteger(pageNumber);
    const searchQuery = req.query.q && req.query.q.length <= 64 ? req.query.q : undefined;

    // Build query - TODO textual searching leaves some to be desired
    const query = {};
    if (searchQuery) {
        query.bool = {};
        query.bool.should = [
            {
                match: {
                    townName: {
                        query: searchQuery
                    }
                }
            },
            {
                match: {
                    townDescription: {
                        query: searchQuery
                    },
                }
            },
            {
                match: {
                    townTags: {
                        query: searchQuery
                    }
                }
            }
        ];
    } else {
        query.match_all = {};
    }

    // Count.
    const totalCount = await es.count({
        index: indexName,
        body: {
            query: query
        }
    });

    // Start buiding out the result.
    const result = {};

    // Update page information.
    format.computePageProperties(pageNumberInt, PAGE_SIZE, totalCount.count, result);

    // Query ES if there are any results
    result.results = [];
    if (totalCount.count > 0) {
        const results = await es.search({
            index: indexName,
            from: PAGE_SIZE * (result.currentPage - 1),
            size: PAGE_SIZE,
            body: {
                query: query
            }
        });

        for (let h of results.hits.hits) {
            result.results.push({
                id: h._id,
                townName: h._source.townName,
                townTags: h._source.townTags,
                townDescription: h._source.townDescription
            });
        }
    }

    return result;
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
router.get('/ajax/page/:pageNumber', (req, res, next) => {
    doAjax(req, res, next)
        .then((result) => {
            res.send(result);
        })
        .catch(next);
});
module.exports = router;