/**
 * Configuration file for Kids Todo App
 */

window.APP_CONFIG = {
    // Production JSONBin credentials - get these from https://jsonbin.io
    JSONBIN_API_KEY: '$2a$10$.w2t8phbdGl.IrCrTiXjv.U7dgmbtxz8d1d5v9E2v8TUacEBVpB7a',
    JSONBIN_BIN_ID: '68bde42fd0ea881f40753f63',

    // Optional: Test bin for safe local development
    // Create a separate bin in your JSONBin account for testing
    // When testing locally, this bin will be used instead of production
    JSONBIN_TEST_BIN_ID: null, // Set to your test bin ID for safe local testing

    // App customization
    APP_TITLE: 'Morning Todo List',
    APP_EMOJI: '🌅',

    // Production domain protection - set to your GitHub Pages domain if deploying
    // Leave as null if you don't need domain-based access control
    // Example: 'yourusername.github.io' or 'your-custom-domain.com'
    PRODUCTION_DOMAIN: 'noahbrat.github.io'
};
