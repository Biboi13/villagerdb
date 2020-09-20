// Requirements.
const cron = require('node-cron');
const birthdays = require('../db/birthdays');
const siteMap = require('./sitemap');
const townReindexer = require('../db/indexer/towns');

/**
 * Clears the birthday key in Redis so they get re-computed on next page load.
 */
function clearBirthdays() {
    console.log('Clearing birthdays...');
    birthdays.clearBirthdays()
        .then(() => {
            console.log('Cleared birthdays successfully.');
        })
        .catch((e) => {
            console.log('Unexpected exception while clearing birthdays.');
            console.error(e);
        });
}

/**
 * Sets up all scheduled crons.
 */
const scheduleCrons = () => {
    // Clear birthdays cache every hour. We do it every hour because it's not very expensive and if something happens
    // where the server wasn't running at midnight, we'd like it to update anyway.
    cron.schedule('0 * * * *', () => {
        clearBirthdays();
    });

    // Sitemap generation every day at 3 AM
    cron.schedule('0 3 * * *', () => {
        siteMap.generateMap();
    });

    // Delta town reindex every 5 minutes.
    cron.schedule('*/5 * * * *', () => {
        townReindexer.deltaReindex()
            .catch((e) => {
                console.log('Unexpected exception while running delta town indexer.');
                console.error(e);
            });
    });
    console.log('Cron schedules submitted.');
};

module.exports.scheduleCrons = scheduleCrons;