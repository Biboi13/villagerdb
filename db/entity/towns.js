const mongo = require('../mongo');

const ENTITY_COLLECTION_NAME = 'towns';
const EVENT_COLLECTION_NAME = 'townevents';

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
     * @param images array of image filenames for the town
     * @returns {Promise<*>}
     */
    async createTown(username, townId, townName, townAddress, townDescription, townTags, images) {
        const villagerDb = await this.db.get();
        await villagerDb.collection(ENTITY_COLLECTION_NAME).insertOne({
            username: username,
            townId: townId,
            townName: townName,
            townAddress: townAddress,
            townDescription: townDescription,
            townTags: townTags,
            images: images
        });

        // For delayed indexer
        await villagerDb.collection(EVENT_COLLECTION_NAME).insertOne({
            eventType: 'create',
            date: new Date(),
            username: username,
            townId: townId,
            townName: townName,
            townAddress: townAddress,
            townDescription: townDescription,
            townTags: townTags,
            images: images
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
     * @param images array of image filenames for the town
     * @returns {Promise<*>}
     */
    async saveTown(username, townId, townName, townAddress, townDescription, townTags, images) {
        const villagerDb = await this.db.get();
        await villagerDb.collection(ENTITY_COLLECTION_NAME).updateOne(
            {
                username: username,
                townId: townId
            },
            {
                $set: {
                    townName: townName,
                    townAddress: townAddress,
                    townDescription: townDescription,
                    townTags: townTags,
                    images: images
            }
        });

        // For delayed indexer
        await villagerDb.collection(EVENT_COLLECTION_NAME).insertOne({
            eventType: 'update',
            date: new Date(),
            username: username,
            townId: townId,
            townName: townName,
            townAddress: townAddress,
            townDescription: townDescription,
            townTags: townTags,
            images: images
        });
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
        await villagerDb.collection(ENTITY_COLLECTION_NAME)
            .deleteOne({
                username: username,
                townId: townId
            });

        // For delayed indexer
        await villagerDb.collection(EVENT_COLLECTION_NAME).insertOne({
            eventType: 'delete',
            date: new Date(),
            username: username,
            townId: townId
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
        return villagerDb.collection(ENTITY_COLLECTION_NAME)
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
        return villagerDb.collection(ENTITY_COLLECTION_NAME)
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
        const cursor = villagerDb.collection(ENTITY_COLLECTION_NAME)
            .find({});
        while (await cursor.hasNext()) {
            await func(await cursor.next());
        }
    }

    /**
     * Grabs the requested number of changes in chronological order for reindexing.
     *
     * @param batchSize number of changes to grab
     * @param func walker function
     * @returns {Promise<void>}
     */
    async walkTownChanges(batchSize, func) {
        const villagerDb = await this.db.get();
        const cursor = villagerDb.collection(EVENT_COLLECTION_NAME)
            .find({})
            .limit(batchSize);
        while (await cursor.hasNext()) {
            await func(await cursor.next());
        }
    }

    /**
     * Delete an entry from the town events collection.
     *
     * @param changeId
     * @returns {Promise<void>}
     */
    async deleteChange(changeId) {
        const villagerDb = await this.db.get();
        await villagerDb.collection(EVENT_COLLECTION_NAME)
            .deleteOne({
                _id: changeId
            });
    }
}

module.exports = new Towns(mongo);