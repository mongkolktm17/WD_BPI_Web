/**
 * SDK Loader
 * 
 * This file handles loading optional SDKs without throwing errors
 * if they are not available (e.g., in local development).
 * 
 * @file sdk-loader.js
 * @version 1.0
 * @date 2025-12-25
 */

// Safe loader for optional SDKs: append script tags and log failures instead of throwing 404 errors.
(function () {
    const sdkUrls = ['/_sdk/element_sdk.js', '/_sdk/data_sdk.js'];
    sdkUrls.forEach(url => {
        const s = document.createElement('script');
        s.src = url;
        s.defer = true;
        s.onload = () => console.log('Loaded', url);
        s.onerror = () => console.warn('Optional SDK not found:', url);
        document.head.appendChild(s);
    });
})();

/**
 * SOURCE LOCATION IN dashboard.php:
 * Lines: 195-208
 * 
 * This code is already complete and can be used as-is.
 * No modifications needed.
 */
