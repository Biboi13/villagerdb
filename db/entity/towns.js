const mongo = require('../mongo');
const ObjectId = require('mongodb').ObjectID;

const COLLECTION_NAME = 'towns';

/**
 * Towns repository.
 */
class Towns {

    /**
     * Build the Towns class taking in the MongoDatabase object.
     *
     * @param db
     */
    constructor(db) {
        this.db = db;
    }

    /**
     * Save a new town to the database.
     *
     * @param username the user who owns the town
     * @param townId the id of the town (url friendly)
     * @param townName the name of the town
     * @param townAddress the address of the town
     * @param townDescription the description of the town
     * @param townTags tags for the town
     * @returns {Promise<*>}
     */
    async createTown(username, townId, townName, townAddress, townDescription, townTags) {
        const villagerDb = await this.db.get();
        await villagerDb.collection(COLLECTION_NAME).insertOne({
            username: username,
            townId: townId,
            townName: townName,
            townAddress: townAddress,
            townDescription: townDescription,
            townTags: townTags
        });
    }

    /**
     * Update a town to the database.
     *
     * @param username the user who owns the town
     * @param townId the id of the town (url friendly)
     * @param townName the new name of the town
     * @param townAddress the new address of the town
     * @param townDescription the new description of the town
     * @param townTags new tags for the town
     * @returns {Promise<*>}
     */
    async saveTown(username, townId, townName, townAddress, townDescription, townTags) {
        const villagerDb = await this.db.get();
        await villagerDb.collection(COLLECTION_NAME).updateOne(
            {
                username: username,
                townId: townId
            },
            {
                $set: {
                    townName: townName,
                    townAddress: townAddress,
                    townDescription: townDescription,
                    townTags: townTags
            }
        });
    }

    /**
     * Find a town by the (username, townId) tuple
     *
     * @param username the town owner
     * @param townId the id of the town
     * @returns {Promise<*>}
     */
    async findTownById(username, townId) {
        const villagerDb = await this.db.get();
        return villagerDb.collection(COLLECTION_NAME)
            .findOne({
                username: username,
                townId: townId
            });
    }

    /**
     * Find all the towns a user owns.
     *
     * @param username the owner of the towns
     * @returns {Promise<*>}
     */
    async findTowns(username) {
        const villagerDb = await this.db.get();
        return villagerDb.collection(COLLECTION_NAME)
            .find({
                username: username,
            }).toArray();
    }

    /**
     * Walk towns using the given callback function. Useful for full-site reindexing.
     *
     * @param func
     * @returns {Promise<void>}
     */
    async walkTowns(func) {
        const villagerDb = await this.db.get();
        const cursor = villagerDb.collection(COLLECTION_NAME)
            .find({});
        while (await cursor.hasNext()) {
            await func(await cursor.next());
        }
    }

    /**
     * Delete a town by the (username, townId) tuple.
     *
     * @param username the town owner
     * @param townId the town id
     * @returns {Promise<*>}
     */
    async deleteTownById(username, townId) {
        const villagerDb = await this.db.get();
        return villagerDb.collection(COLLECTION_NAME)
            .deleteOne({
                username: username,
                townId: townId
            });
    }
}

module.exports = new Towns(mongo);