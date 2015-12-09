// Copyright 2015, EMC, Inc.
'use strict';

module.exports = MessengerFactory;
MessengerFactory.$provide = 'Task.Messenger';
MessengerFactory.$inject = [
    'Services.Configuration',
    '$injector'
];

function MessengerFactory(config, injector) {
    var messenger = config.get('messenger', 'AMQP');
    switch(messenger) {
        case 'AMQP':
            return injector.get('Task.Messenger.AMQP');
        case 'mongo':
            return injector.get('Task.Messenger.mongo');
        default:
            throw new Error('Unknown messenger: ' + messenger);
    }
}
