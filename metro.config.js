// https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// @sentry/core v10+ ships ESM builds that use "./utils/dsn.js"-style imports.
// Metro cannot resolve these bare .js extension imports, so we redirect the
// entire @sentry/core ESM build directory to the CJS equivalent.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Rewrite @sentry/core ESM imports to CJS
  if (moduleName.includes("@sentry/core/build/esm")) {
    const cjsModule = moduleName.replace(
      "@sentry/core/build/esm",
      "@sentry/core/build/cjs",
    );
    return context.resolveRequest(context, cjsModule, platform);
  }

  // For relative .js imports originating from inside @sentry/core's esm dir,
  // redirect them to cjs as well
  const originDir = context.originModulePath ?? "";
  if (
    originDir.includes(`@sentry${path.sep}core${path.sep}build${path.sep}esm`)
  ) {
    const cjsOrigin = originDir.replace(
      `@sentry${path.sep}core${path.sep}build${path.sep}esm`,
      `@sentry${path.sep}core${path.sep}build${path.sep}cjs`,
    );
    return context.resolveRequest(
      { ...context, originModulePath: cjsOrigin },
      moduleName,
      platform,
    );
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
