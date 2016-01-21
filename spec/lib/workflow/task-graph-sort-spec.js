// Copyright 2015-2016, EMC, Inc.
/* jshint node:true */

'use strict';

describe("Task Graph sorting", function () {
    var TaskGraph;
    var Constants;

    before(function() {
        helper.setupInjector([
            helper.require('/lib/workflow/task-graph.js')
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

        var output = TaskGraph.prototype.topologicalSortTasks.call(graph);
        expect(output).to.deep.equal([['1'], ['2'], ['3']]);
    });

    it('should topologically sort parallel tasks', function() {
        var graph = {
            tasks: {
                '1': { },
                '2': { },
                '3': { waitingOn: { '2': 'finished' } }
            }
        };

        var output = TaskGraph.prototype.topologicalSortTasks.call(graph);
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

        var output = TaskGraph.prototype.topologicalSortTasks.call(graph);
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

        var output = TaskGraph.prototype.topologicalSortTasks.call(graph);
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

        var output = TaskGraph.prototype.topologicalSortTasks.call(graph);
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

        expect(TaskGraph.prototype.topologicalSortTasks.bind(graph))
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

        expect(TaskGraph.prototype.topologicalSortTasks.bind(graph))
            .to.throw(/Detected a cyclic graph with tasks test2 and test3/);
    });
});
