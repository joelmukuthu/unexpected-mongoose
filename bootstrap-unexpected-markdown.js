/*global unexpected:true, mongoose:true*/ // eslint-disable-line no-unused-vars
unexpected = require('unexpected');
unexpected.output.preferredWidth = 80;
unexpected.use(require('./lib/unexpected-mongoose'));

mongoose = require('mongoose');
