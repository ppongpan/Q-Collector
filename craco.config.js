module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      return webpackConfig;
    }
  },
  devServer: (devServerConfig) => {
    // Remove deprecated onBeforeSetupMiddleware and onAfterSetupMiddleware
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;

    // Use new setupMiddlewares API
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      // Custom middleware can be added here if needed
      // Example: Before middlewares
      // middlewares.unshift({
      //   name: 'custom-before',
      //   middleware: (req, res, next) => {
      //     // Your custom logic
      //     next();
      //   }
      // });

      // Example: After middlewares
      // middlewares.push({
      //   name: 'custom-after',
      //   middleware: (req, res, next) => {
      //     // Your custom logic
      //     next();
      //   }
      // });

      return middlewares;
    };

    return devServerConfig;
  }
};
