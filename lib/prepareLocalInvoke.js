'use strict';

const path = require('path');
const BbPromise = require('bluebird');
const _ = require('lodash');
const Utils = require('./utils');

module.exports = {
  prepareLocalInvoke() {
    const originalPath = this.serverless.config.serverless.processedInput.options.path;
    if (originalPath) {
      const absolutePath = path.resolve(originalPath);
      this.serverless.config.serverless.processedInput.options.path = absolutePath;
    }

    const isOffline = !!this.options['webpack-offline'];
    const isNoBuild = this.options.build === false;
    // webpack-offline is only allowed together with no-build
    if (isOffline && !isNoBuild) {
      return BbPromise.reject(new this.serverless.classes.Error('--webpack-offline can only be specified together with --no-build'));
    }

    // Set service path to compiled code for local invoke.
    this.originalServicePath = this.serverless.config.servicePath;
    if (_.get(this.serverless, 'service.package.individually') && (!isOffline || !isNoBuild)) {
      this.serverless.config.servicePath = path.join(this.webpackOutputPath, this.options.function);
    } else {
      this.serverless.config.servicePath = path.join(this.webpackOutputPath, 'service');
    }

    // Set service path as CWD to allow accessing bundled files correctly
    process.chdir(this.serverless.config.servicePath);

    // Remove handler from module cache to allow load of changed code.
    const func = this.serverless.service.getFunction(this.options.function);
    const handlerFile = path.join(
      this.serverless.config.servicePath,
      this.options.extraServicePath || '',
      _.join(_.initial(_.split(func.handler, '.')), '.')
    );
    return Utils.purgeCache(handlerFile);
  }
};
