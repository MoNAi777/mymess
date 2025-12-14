const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to add SYSTEM_ALERT_WINDOW permission
 * Required for floating bubble overlay functionality
 */
function withFloatingBubble(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Ensure uses-permission array exists
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    // Add SYSTEM_ALERT_WINDOW permission if not already present
    const hasPermission = androidManifest.manifest['uses-permission'].some(
      (perm) => perm.$?.['android:name'] === 'android.permission.SYSTEM_ALERT_WINDOW'
    );

    if (!hasPermission) {
      androidManifest.manifest['uses-permission'].push({
        $: {
          'android:name': 'android.permission.SYSTEM_ALERT_WINDOW',
        },
      });
    }

    // Add FOREGROUND_SERVICE permission for background bubble service
    const hasForegroundService = androidManifest.manifest['uses-permission'].some(
      (perm) => perm.$?.['android:name'] === 'android.permission.FOREGROUND_SERVICE'
    );

    if (!hasForegroundService) {
      androidManifest.manifest['uses-permission'].push({
        $: {
          'android:name': 'android.permission.FOREGROUND_SERVICE',
        },
      });
    }

    return config;
  });
}

module.exports = withFloatingBubble;
