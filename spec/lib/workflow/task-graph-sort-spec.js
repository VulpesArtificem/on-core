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

    it('should topologically sort linear tasks', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { waitingOn: { '1': 'finished' } },
                '3': { waitingOn: { '2': 'finished' } }
            }
        };
        graph = Object.assign(graph, TaskGraph.prototype);

        var output = graph.topologicalSortTasks();
        expect(output).to.deep.equal([['1'], ['2'], ['3']]);
    });

    it('should topologically sort parallel tasks', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { },
                '3': { waitingOn: { '2': 'finished' } }
            },
        };
        graph = Object.assign(graph, TaskGraph.prototype);

        var output = graph.topologicalSortTasks();
        expect(output).to.deep.equal([['1', '2'], ['3']]);
    });

    it('should topologically sort tasks with multiple dependencies', function() {
        var graph = {
            tasks: {
                '1': { },
                'A': { },
                '2': { waitingOn: { '1': 'finished' } },
                '3': { waitingOn: {
                        '2': 'finished',
                        'A': 'finished'
                    }
                }
            }
        };
        graph = Object.assign(graph, TaskGraph.prototype);

        var output = graph.topologicalSortTasks();
        expect(output).to.deep.equal([['1', 'A'], ['2'], ['3']]);
    });

    it('should topologically sort a graph with a mix of task states', function() {
        var graph = {
            tasks: {
                '1': { state: Constants.TaskStates.Succeeded },
                '2': { state: Constants.TaskStates.Failed },
                '3': { waitingOn: { '1': 'finished' } },
                '4': { waitingOn: { '2': Constants.TaskStates.Failed } }
            }
        };
        graph = Object.assign(graph, TaskGraph.prototype);

        var output = graph.topologicalSortTasks();
        expect(output).to.deep.equal([['3', '4']]);
    });

    it('should topologically sort a complex graph', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { waitingOn: { '1': 'finished' } },
                '3': { waitingOn: { '2': 'finished' } },
                '4': { waitingOn: { '2': 'finished' } },
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

        var output = graph.topologicalSortTasks();
        expect(output).to.deep.equal([
            ['1', '7'],
            ['2'],
            ['3', '4'],
            ['6', '8'],
            ['5']
        ]);
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

        expect(graph.topologicalSortTasks.bind(graph))
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

        expect(graph.topologicalSortTasks.bind(graph))
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
});
