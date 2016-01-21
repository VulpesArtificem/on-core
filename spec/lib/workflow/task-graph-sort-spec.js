// Copyright 2015-2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Task Graph sorting", function () {
    var TaskGraph;
    var Constants;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/workflow/task-graph.js'),
            helper.di.simpleWrapper([], 'Task.taskLibrary'),
            helper.di.simpleWrapper({}, 'TaskGraph.Store')
        ]);
        Constants = helper.injector.get('Constants');
        TaskGraph = helper.injector.get('TaskGraph.TaskGraph');
    });

    it('should throw on a cyclic task graph', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { injectableName: 'test2',
                        waitingOn: { '3': 'finished' }
                },
                '3': {
                        injectableName: 'test3',
                        waitingOn: { '2': 'finished' }
                }
            }
        };
        graph = Object.assign(graph, TaskGraph.prototype);

        expect(graph.detectCyclesAndSetTerminalTasks.bind(graph))
            .to.throw(/Detected a cyclic graph with tasks test2 and test3/);
    });

    it('should throw on a cyclic task graph with > 1 levels of indirection', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { injectableName: 'test2',
                        waitingOn: { 'A': 'finished' }
                },
                '3': { injectableName: 'test3',
                        waitingOn: { '2': 'finished' }
                },
                '4': { waitingOn: { '3': 'finished' } },
                '5': { waitingOn: { '4': 'finished' } },
                'A': { waitingOn: { '5': 'finished' } }
            }
        };
        graph = Object.assign(graph, TaskGraph.prototype);

        expect(graph.detectCyclesAndSetTerminalTasks.bind(graph))
            .to.throw(/Detected a cyclic graph with tasks test2 and test3/);
    });

    it('should set terminal tasks correctly for the "finished" catch-all state', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { waitingOn: { '1': 'finished' } },
                '3': { waitingOn: { '2': 'finished' } },
                '4': { waitingOn: { '2': 'finished' } }
            }
        };
        graph = Object.assign(graph, TaskGraph.prototype);

        graph.detectCyclesAndSetTerminalTasks();

        expect(graph.tasks['1']).to.have.property('terminalOnStates');
        expect(graph.tasks['1'].terminalOnStates).to.deep.equal([]);
        expect(graph.tasks['2']).to.have.property('terminalOnStates');
        expect(graph.tasks['2'].terminalOnStates).to.deep.equal([]);
        expect(graph.tasks['3']).to.have.property('terminalOnStates');
        expect(graph.tasks['3'].terminalOnStates.sort())
            .to.deep.equal(Constants.FinishedTaskStates.sort());
        expect(graph.tasks['4']).to.have.property('terminalOnStates');
        expect(graph.tasks['4'].terminalOnStates.sort())
            .to.deep.equal(Constants.FinishedTaskStates.sort());
    });

    it('should set terminal nodes when there are failure branches', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { waitingOn: { '1': 'failed' } }
            }
        };

        graph = Object.assign(graph, TaskGraph.prototype);
        graph.detectCyclesAndSetTerminalTasks();

        expect(graph.tasks['1']).to.have.property('terminalOnStates');
        expect(graph.tasks['1'].terminalOnStates.sort()).to.deep.equal([
            Constants.TaskStates.Cancelled,
            Constants.TaskStates.Succeeded,
            Constants.TaskStates.Timeout
        ]);
        expect(graph.tasks['2']).to.have.property('terminalOnStates');
        expect(graph.tasks['2'].terminalOnStates.sort()).to.deep.equal(
            Constants.FinishedTaskStates.sort());
    });

    it('should set terminal nodes when there are deep failure branches', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { waitingOn: { '1': 'failed' } },
                '3': { waitingOn: { '2': 'failed' } }
            }
        };

        graph = Object.assign(graph, TaskGraph.prototype);
        graph.detectCyclesAndSetTerminalTasks();

        expect(graph.tasks['1']).to.have.property('terminalOnStates');
        expect(graph.tasks['1'].terminalOnStates.sort()).to.deep.equal([
            Constants.TaskStates.Cancelled,
            Constants.TaskStates.Succeeded,
            Constants.TaskStates.Timeout
        ]);
        expect(graph.tasks['2']).to.have.property('terminalOnStates');
        expect(graph.tasks['2'].terminalOnStates.sort()).to.deep.equal([
            Constants.TaskStates.Cancelled,
            Constants.TaskStates.Succeeded,
            Constants.TaskStates.Timeout
        ]);
        expect(graph.tasks['3']).to.have.property('terminalOnStates');
        expect(graph.tasks['3'].terminalOnStates.sort()).to.deep.equal(
            Constants.FinishedTaskStates.sort());
    });

    it('should set terminal nodes when there are failure and success branches', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { waitingOn: { '1': 'failed' } },
                '3': { waitingOn: { '2': 'failed' } },
                '4': { waitingOn: { '1': 'succeeded' } }
            }
        };

        graph = Object.assign(graph, TaskGraph.prototype);
        graph.detectCyclesAndSetTerminalTasks();

        expect(graph.tasks['1']).to.have.property('terminalOnStates');
        expect(graph.tasks['1'].terminalOnStates.sort()).to.deep.equal([
            Constants.TaskStates.Cancelled,
            Constants.TaskStates.Timeout
        ]);
        expect(graph.tasks['2']).to.have.property('terminalOnStates');
        expect(graph.tasks['2'].terminalOnStates.sort()).to.deep.equal([
            Constants.TaskStates.Cancelled,
            Constants.TaskStates.Succeeded,
            Constants.TaskStates.Timeout
        ]);
        expect(graph.tasks['3']).to.have.property('terminalOnStates');
        expect(graph.tasks['3'].terminalOnStates.sort()).to.deep.equal(
            Constants.FinishedTaskStates.sort());
    });

    it('should set terminal nodes when there are failure and success branches', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { waitingOn: { '1': 'failed' } },
                '3': { waitingOn: { '2': 'failed' } },
                '4': { waitingOn: { '1': 'succeeded' } }
            }
        };

        graph = Object.assign(graph, TaskGraph.prototype);
        graph.detectCyclesAndSetTerminalTasks();

        expect(graph.tasks['1']).to.have.property('terminalOnStates');
        expect(graph.tasks['1'].terminalOnStates.sort()).to.deep.equal([
            Constants.TaskStates.Cancelled,
            Constants.TaskStates.Timeout
        ]);
        expect(graph.tasks['2']).to.have.property('terminalOnStates');
        expect(graph.tasks['2'].terminalOnStates.sort()).to.deep.equal([
            Constants.TaskStates.Cancelled,
            Constants.TaskStates.Succeeded,
            Constants.TaskStates.Timeout
        ]);
        expect(graph.tasks['3']).to.have.property('terminalOnStates');
        expect(graph.tasks['3'].terminalOnStates.sort()).to.deep.equal(
            Constants.FinishedTaskStates.sort());
    });

    it('should mark terminal states correctly for a complex graph', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { waitingOn: { '1': 'finished' } },
                '3': { waitingOn: { '2': 'succeeded' } },
                '4': { waitingOn: { '2': ['failed', 'timeout'] } },
                '5': { waitingOn: {
                        '3': 'finished',
                        '6': 'finished'
                    }
                },
                '6': { waitingOn: { '4': 'finished' } },
                '7': { },
                '8': { waitingOn: {
                        '4': 'finished',
                        '7': 'finished'
                    }
                },
            }
        };
        graph = Object.assign(graph, TaskGraph.prototype);
        graph.detectCyclesAndSetTerminalTasks();

        _.forEach(['1', '3', '4', '7'], function(label) {
            expect(graph.tasks[label]).to.have.property('terminalOnStates');
            expect(graph.tasks[label].terminalOnStates).to.deep.equal([]);
        });

        expect(graph.tasks['2']).to.have.property('terminalOnStates');
        expect(graph.tasks['2'].terminalOnStates).to.deep.equal([
            Constants.TaskStates.Cancelled
        ]);

        expect(graph.tasks['6']).to.have.property('terminalOnStates');
        expect(graph.tasks['6'].terminalOnStates).to.deep.equal([]);

        expect(graph.tasks['5']).to.have.property('terminalOnStates');
        expect(graph.tasks['5'].terminalOnStates.sort())
            .to.deep.equal(Constants.FinishedTaskStates.sort());

        expect(graph.tasks['8']).to.have.property('terminalOnStates');
        expect(graph.tasks['8'].terminalOnStates.sort())
            .to.deep.equal(Constants.FinishedTaskStates.sort());
    });
});
