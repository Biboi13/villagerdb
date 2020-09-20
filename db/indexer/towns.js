/**
 * Delta and full town indexer.
 */

const towns = require('../../db/entity/towns');
const es = require('../../db/elasticsearch');
const cache = require('../../db/cache');

const searchConfig = require('../../config/search.js');

function getDocumentId(username, townId) {
    return username + '-' + townId;
}

/**
 * Number of changes to reindex at a time.
 * @type {number}
 */
const CHANGE_SIZE = 100;

/**
 * Create or update a town in the index.
 *
 * @param indexName
 * @param isNew
 * @param town
 * @returns {Promise<void>}
 */
async function indexTown(indexName, town) {
    const documentId = getDocumentId(town.username, town.townId);
    const document = {
        username: town.username,
        townName: town.townName,
        townDescription: town.townDescription,
        townTags: town.townTags
    };

    await es.index({
        index: indexName,
        id: documentId,
        body: document
    });
    console.log('Indexed town create or update ' + documentId)
}

/**
 * Remove a town from the ElasticSearch index.
 *
 * @param indexName
 * @param username
 * @param townId
 * @returns {Promise<void>}
 */
async function deleteTown(indexName, username, townId) {
    const documentId = getDocumentId(username, townId);
    try {
        await es.delete({
            index: indexName,
            id: documentId
        });
    } catch (e) {} // If it doesn't exist, don't stop.
    console.log('Indexed town delete ' + documentId)
}

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
        await indexTown(newIndexName, town);
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

/**
 * Partial reindex, walking the change table and deleting entries afer.
 * @returns {Promise<void>}
 */
async function deltaReindex() {
    console.log('Delta reindex started.');
    // Get current index
    const indexName = await cache.get(searchConfig.TOWN_INDEX_NAME);
    if (!indexName) {
        console.log('Stopping. There is no index created yet.');
        return;
    }

    // Walk changes
    await towns.walkTownChanges(CHANGE_SIZE, async (change) => {
        if (change.eventType === 'create' || change.eventType === 'update') {
            await indexTown(indexName, change);
        } else if (change.eventType === 'delete') {
            await deleteTown(indexName, change.username, change.townId);
        }

        // Delete the entry from the database.
        await towns.deleteChange(change._id);
    });

    console.log('Delta reindex finished.');
};
module.exports.deltaReindex = deltaReindex;