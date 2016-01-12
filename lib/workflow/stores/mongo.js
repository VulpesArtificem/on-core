// Copyright 2015, EMC, Inc.
'use strict';

module.exports = mongoStoreFactory;
mongoStoreFactory.$provide = 'TaskGraph.Stores.Mongo';
mongoStoreFactory.$inject = [
    'Services.Waterline',
    'Promise',
    'Constants',
    'Errors',
    'Assert',
    '_'
];
function mongoStoreFactory(waterline, Promise, Constants, Errors, assert, _) {
    var exports = {};
    exports.calls = {};
    function callCount(func) {
        if(!exports.calls[func]) {
            exports.calls[func] = 1;
            return;
        }
        exports.calls[func] += 1;
    }
    process.on('SIGINT', function() {
        console.log('store calls: ',exports.calls);
    });
    // NOTE: This is meant to be idempotent, and just drop the update silently
    // if the graph has already been marked as done elsewhere and the query returns
    // empty.
    exports.setGraphDone = function(state, data) {
        assert.string(state);
        assert.object(data);
        assert.string(data.graphId);

        var query = {
            instanceId: data.graphId,
            _status: Constants.TaskStates.Pending
        };
        var update = {
            $set: {
                _status: state
            }
        };
        var options = {
            new: true
        };
        callCount('setGraphDone');
        return waterline.graphobjects.findAndModifyMongo(query, {}, update, options);
    };

    exports.setTaskState = function(taskId, graphId, state) {
        assert.string(taskId);
        assert.string(graphId);
        assert.string(state);

        // TODO: including graphId with the intent that we'll create an
        // index against it in the database
        var query = {
            graphId: graphId,
            taskId: taskId,
            reachable: true
        };
        var update = {
            $set: {
                state: state
            }
        };
        var options = {
            multi: true
        };

        callCount('setTaskState');
        return waterline.taskdependencies.updateMongo(query, update, options);
    };

    exports.setTaskStateInGraph = function(data) {
        assert.string(data.taskId);
        assert.string(data.graphId);
        assert.string(data.state);

        // TODO: including graphId with the intent that we'll create an
        // index against it in the database
        var query = {
            instanceId: data.graphId
        };
        var update = {
            $set: {}
        };
        update.$set[data.taskId + 'state'] = data.state;
        var options = {
            new: true
        };
        callCount('setTaskStateInGraph');
        return waterline.graphobjects.findAndModifyMongo(query, {}, update, options);
    };

    exports.getTaskDefinition = function(injectableName) {
        return waterline.taskdefinitions.findOne({ injectableName: injectableName })
        .then(function(taskDefinition) {
            if (_.isEmpty(taskDefinition)) {
                throw new Errors.NotFoundError(
                    'Could not find task definition with injectableName %s'
                    .format(injectableName));
            }
            callCount('getTaskDefinition');
            return taskDefinition.toJSON();
        });
    };

    exports.persistGraphDefinition = function(definition) {
        var query = {
            injectableName: definition.injectableName
        };
        var options = {
            new: true,
            upsert: true
        };
        callCount('persistGraphDefinition');
        return waterline.graphdefinitions.findAndModifyMongo(query, {}, definition, options);
    };

    exports.persistTaskDefinition = function(definition) {
        var query = {
            injectableName: definition.injectableName
        };
        var options = {
            new: true,
            upsert: true
        };
        callCount('persistTaskDefinition');
        return waterline.taskdefinitions.findAndModifyMongo(query, {}, definition, options);
    };

    exports.getGraphDefinitions = function() {
        callCount('getGraphDefinitions');
        return waterline.graphdefinitions.find({});
    };

    exports.getTaskDefinitions = function() {
        callCount('getTaskDefinition');
        return waterline.taskdefinitions.find({});
    };

    exports.persistGraphObject = function(graph) {
        var query = {
            instanceId: graph.instanceId
        };
        var options = {
            new: true,
            upsert: true,
            fields: {
                _id: 0,
                instanceId: 1
            }
        };
        callCount('persistGraphObject');
        return waterline.graphobjects.findAndModifyMongo(query, {}, graph, options);
    };

    exports.persistTaskDependencies = function(taskDependencyItem, graphId) {
        var obj = {
            taskId: taskDependencyItem.taskId,
            graphId: graphId,
            state: Constants.TaskStates.Pending,
            dependencies: taskDependencyItem.dependencies
        };
        callCount('persistTaskDependencies');
        return waterline.taskdependencies.create(obj);
    };

    exports.getTaskById = function(data) {
        assert.object(data);
        assert.string(data.graphId);
        assert.string(data.taskId);

        var query = {
            instanceId: data.graphId
        };
        var options = {
            fields: {
                _id: 0,
                instanceId: 1,
                context: 1,
                tasks: {}
            }
        };
        options.fields.tasks[data.taskId] = 1;
        callCount('getTaskById');
        return waterline.graphobjects.findOne(query)
        .then(function(graph) {
            return {
                graphId: graph.instanceId,
                context: graph.context,
                task: graph.tasks[data.taskId]
            };
        });
    };

    exports.heartbeatTasksForRunner = function(leaseId) {
        var query = {
            taskRunnerLease: leaseId,
            reachable: true,
            state: {$in: [Constants.TaskStates.Pending, Constants.TaskStates.Running]}
        };
        var update = {
            $set: {
                taskRunnerLease: leaseId,
                taskRunnerHeartbeat: new Date()
            }
        };
        var options = {
            multi: true
        };
        callCount('heartbeatTasksForRunner');
        return waterline.taskdependencies.updateMongo(query, update, options);
    };

    exports.getOwnTasks = function(leaseId) {
        var query = {
            where: {
                taskRunnerLease: leaseId,
                reachable: true,
                state: Constants.TaskStates.Pending
            }
        };
        callCount('getOwnTasks');
        return waterline.taskdependencies.find(query);
    };
    exports.findActiveGraphs = function(domain, limit) {
        assert.string(domain);

        var query = {
            where: {
                domain: domain,
                _status: Constants.TaskStates.Pending
            },
            limit: limit
        };
        callCount('findActiveGraphs');
        return waterline.graphobjects.find(query);
    };

    exports.findUnevaluatedTasks = function(domain, limit) {
        assert.string(domain);
        if (limit) {
            assert.number(limit);
        }

        var query = {
            domain: domain,
            evaluated: false,
            reachable: true,
            state: {
                $in: Constants.FinishedTaskStates.concat([Constants.TaskStates.Finished])
            }
        };

        var promise = waterline.taskdependencies.find(query);
        if (limit) {
            promise.limit(limit);
        }
        callCount('findUnevaluatedTasks');
        return promise.then(function(tasks) {
            return _.map(tasks, function(task) {
                return task.toJSON();
            });
        });
    };

    exports.findReadyTasks = function(domain, graphId) {
        assert.string(domain);
        if (graphId) {
            assert.string(graphId);
        }

        var query = {
            taskRunnerLease: null,
            domain: domain,
            dependencies: {},
            reachable: true,
            state: Constants.TaskStates.Pending,
            lastHandler: {$ne: 'scheduler'}
        };
        if (graphId) {
            query.graphId = graphId;
        }
        callCount('findReadyTasks');
        return waterline.taskdependencies.find(query)
        .then(function(tasks) {
            return {
                tasks: _.map(tasks, function(task) { return task.toJSON(); }),
                graphId: graphId || null
            };
        });
    };

    exports.checkoutTask = function(taskRunnerId, data) {
        assert.object(data);
        assert.string(data.graphId);
        assert.string(data.taskId);

        var query = {
            graphId: data.graphId,
            taskId: data.taskId,
            taskRunnerLease: null,
            state: Constants.TaskStates.Pending,
            dependencies: {},
            reachable: true
        };
        var update = {
            $set: {
                taskRunnerLease: taskRunnerId,
                taskRunnerHeartbeat: new Date(),
                lastHandler: taskRunnerId
            }
        };
        var options = {
            new: true
        };
        callCount('checkoutTask');
        return waterline.taskdependencies.findAndModifyMongo(query, {}, update, options);
    };

    exports.quickGetTask = function(data) {
        var query = {
            graphId: data.graphId,
            taskId: data.taskId,
            reachable: true
        };
        return waterline.taskdependencies.findOne(query);
    };

    exports.isTaskFailureHandled = function(graphId, taskId, taskState) {
        assert.string(graphId);
        assert.string(taskId);
        assert.string(taskState);

        var query = {
            graphId: graphId,
        };
        query['dependencies.' + taskId] = {
            $in: _.union(taskState, Constants.FailedTaskStates)
        };

        // TODO: does 'a.b' syntax work in waterline queries or do we have
        // to poke a hole through to native here?
        callCount('isTaskFailureHandled');
        return waterline.taskdependencies.findOneMongo(query)
        .then(function(result) {
            // TODO: will this return an array if using the native findOne?
            // with waterline findOne it will
            return Boolean(result.length);
        });
    };

    exports.checkGraphFinished = function(data) {
        assert.object(data);
        assert.string(data.graphId);

        var query = {
            graphId: data.graphId,
            state: Constants.TaskStates.Pending,
            reachable: true
        };
        callCount('checkGraphFinished');
        return waterline.taskdependencies.findOne(query)
        .then(function(result) {
            if (_.isEmpty(result)) {
                data.done = true;
            } else {
                data.done = false;
            }
            return data;
        });
    };

    exports.updateDependentTasks = function(data) {
        assert.object(data);
        assert.string(data.graphId);
        assert.string(data.taskId);
        assert.string(data.state);

        var query = {
            graphId: data.graphId,
            reachable: true
        };
        query['dependencies.' + data.taskId] = {
            $in: [data.state, Constants.TaskStates.Finished]
        };
        var update = {
            $unset: {}
        };
        update.$unset['dependencies.' + data.taskId] = '';
        var options = {
            multi: true
        };
        callCount('updateDependentTasks');
        return waterline.taskdependencies.updateMongo(query, update, options);
    };

    exports.updateUnreachableTasks = function(data) {
        assert.object(data);
        assert.string(data.graphId);
        assert.string(data.taskId);
        assert.string(data.state);

        var query = {
            graphId: data.graphId,
        };
        console.log(_.difference(Constants.FinishedTaskStates, [data.state]));
        query['dependencies.' + data.taskId] = {
            $in: _.difference(Constants.FinishedTaskStates, [data.state])
        };
        var update = {
            $set: {
                reachable: false
            }
        };
        var options = {
            multi: true
        };
        callCount('updateUnreachableTasks');
        return waterline.taskdependencies.updateMongo(query, update, options);
    };

    exports.markTaskEvaluated = function(data) {
        assert.object(data);
        assert.string(data.graphId);
        assert.string(data.taskId);

        var query = {
            graphId: data.graphId,
            taskId: data.taskId,
            reachable: true
        };
        var update = {
            $set: {
                evaluated: true
            }
        };
        var options = {
            new: true
        };
        callCount('markTaskEvaluated');
        return waterline.taskdependencies.findAndModifyMongo(query, {}, update, options);
    };

    exports.findExpiredLeases = function(domain, leaseAdjust) {
        assert.string(domain);
        assert.number(leaseAdjust);

        var query = {
            domain: domain,
            reachable: true,
            taskRunnerLease: { $ne: null },
            taskRunnerHeartbeat: {
                $lt: new Date(Date.now() - leaseAdjust)
            },
            state: Constants.TaskStates.Pending
        };
        callCount('findExpiredLeases');
        return waterline.taskdependencies.find(query);
    };

    exports.expireLease = function(taskId) {
        assert.string(taskId);

        var query = {
            taskId: taskId,
            reachable: true
        };
        var update = {
            $set: {
                taskRunnerLease: null,
                taskRunnerHeartbeat: null
            }
        };
        var options = {
            new: false
        };
        callCount('expireLease');
        return waterline.taskdependencies.findAndModifyMongo(query, {}, update, options);
    };

    exports.deleteCompletedTasks = function() {
        var query = {
            evaluated: true,
            state: {
                $in: Constants.FinishedTaskStates.concat([Constants.TaskStates.Finished])
            }
        };
        callCount('deleteCompletedTasks');
        return waterline.taskdependencies.destroy(query);
    };

    return exports;
}
