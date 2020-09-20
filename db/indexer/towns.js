/**
 * Delta and full town indexer.
 */

const towns = require('../../db/entity/towns');
const es = require('../../db/elasticsearch');
const cache = require('../../db/cache');

const searchConfig = require('../../config/search.js');

/**
 * Builds an entirely new town index. Potentially expensive in the future.
 *
 * @returns {Promise<void>}
 */
async function fullReindex() {
    const newIndexName = 'towns_' + Date.now();

    // Create the index.
    await es.indices.create({
        index: newIndexName
    });

    // Define the index mappings properly.
    await es.indices.putMapping({
        index: newIndexName,
        body: {
            properties: {
                username: {
                    type: 'keyword'
                },
                townName: {
                    type: 'keyword'
                },
                townDescription: {
                    type: 'text'
                },
                townTags: {
                    type: 'keyword'
                }
            }
        }
    });

    // Create the new documents
    await towns.walkTowns(async (town) => {
        await es.index({
            index: newIndexName,
            id: town.username + '-' + town.townId,
            body: {
                username: town.username,
                townName: town.townName,
                townDescription: town.townDescription,
                townTags: town.townTags
            }
        });
    });

    // Save the new index name to the cache.
    const oldIndexName = await cache.get(searchConfig.TOWN_INDEX_NAME);
    await cache.set(searchConfig.TOWN_INDEX_NAME, newIndexName);
    console.log('New town index name: ' + newIndexName);

    // Delete the old index if existing.
    if (oldIndexName) {
        await es.indices.delete({
            index: oldIndexName
        });
        console.log('Deleted old town index ' + oldIndexName);
    }
};
module.exports.fullReindex = fullReindex;

async function deltaReindex() {

};
module.exports.deltaReindex = deltaReindex;