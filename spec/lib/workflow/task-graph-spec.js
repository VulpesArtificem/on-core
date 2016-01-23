// Copyright 2016, EMC, Inc.
'use strict';

describe('Task Graph', function () {
    var TaskGraph;
    var getDefinitions;

    before(function() {
        getDefinitions = require('./test-definitions').get;
        helper.setupInjector([
            helper.require('/lib/workflow/task-graph.js'),
            helper.di.simpleWrapper([], 'Task.taskLibrary'),
            helper.di.simpleWrapper({}, 'TaskGraph.Store')
        ]);
        TaskGraph = helper.injector.get('TaskGraph.TaskGraph');
    });

    describe("Validation", function() {
        this.testTasks = [];
        this.testGraphs = [];
        var taskLibrary;
        var definitions;

        beforeEach(function() {
            definitions = getDefinitions();
            taskLibrary = helper.injector.get('Task.taskLibrary');
            while (taskLibrary.length) {
                taskLibrary.pop();
            }
            taskLibrary.push(definitions.baseTask);
            taskLibrary.push(definitions.testTask);
        });

        it("should validate task labels", function() {
            definitions.graphDefinition.tasks.push({
                'label': 'test-duplicate'
            });
            definitions.graphDefinition.tasks.push({
                'label': 'test-duplicate'
            });
            var promise = TaskGraph.create('domain', { definition: definitions.graphDefinition });
            expect(promise).to.be.rejectedWith(
                /The task label \'test-duplicate\' is used more than once in the graph definition/
            );
        });

        it("should get a base task", function() {
            expect(TaskGraph.prototype._getBaseTask(definitions.testTask))
                .to.deep.equal(definitions.baseTask);
        });

        it("should throw if a base task does not exist", function() {
            definitions.testTask.implementsTask = 'Task.Base.doesNotExist';
            expect(function() {
                TaskGraph.prototype._getBaseTask(definitions.testTask);
            }).to.throw(/Base task definition.*should exist/);
        });

        it("should validate a task definition", function() {
            expect(function() {
                TaskGraph.prototype._validateTaskDefinition(definitions.testTask);
            }).to.not.throw(Error);

            _.forEach(_.keys(definitions.testTask), function(key) {
                expect(function() {
                    var _definition = _.omit(definitions.testTask, key);
                    TaskGraph.prototype._validateTaskDefinition(_definition);
                }).to.throw(Error);
            });

            _.forEach(_.keys(definitions.testTask), function(key) {
                expect(function() {
                    var _definition = _.cloneDeep(definitions.testTask);
                    // Assert bad types, we won't expect any of our values to be functions
                    _definition[key] = function() {};
                    TaskGraph.prototype._validateTaskDefinition(_definition);
                }).to.throw(/required/);
            });
        });

        it("should validate task properties", function() {
            taskLibrary.push(definitions.baseTask1);
            taskLibrary.push(definitions.baseTask2);
            taskLibrary.push(definitions.baseTask3);
            taskLibrary.push(definitions.testTask1);
            taskLibrary.push(definitions.testTask2);
            taskLibrary.push(definitions.testTask3);

            var context = {};

            expect(function() {
                TaskGraph.prototype._validateProperties(definitions.testTask1, context);
            }).to.not.throw();

            expect(context).to.have.property('properties')
                .that.deep.equals(definitions.testTask1.properties);

            // baseTask2 adds a bunch of required properties provided by testTask1
            expect(function() {
                TaskGraph.prototype._validateProperties(definitions.testTask2, context);
            }).to.not.throw();

            // baseTask3 adds some of required properties that are not provided
            expect(function() {
                TaskGraph.prototype._validateProperties(definitions.testTask3, context);
            }).to.throw(/expected property \[does\] to be supplied for task/);
        });
    });
});
