"use strict";

module.exports.get = function() {
    var graphDefinition = {
        friendlyName: 'Test Graph',
        injectableName: 'Graph.test',
        tasks: [
            { label: 'test-1',
              taskName: 'Task.test' },
            { label: 'test-2',
              taskName: 'Task.test',
              waitOn: { 'test-1': 'finished' } }
        ]
    };
    var baseTask = {
        friendlyName: 'Base test task',
        injectableName: 'Task.Base.test',
        runJob: 'Job.test',
        requiredOptions: [],
        requiredProperties: {},
        properties: {}
    };
    var testTask = {
        friendlyName: 'Test task',
        implementsTask: 'Task.Base.test',
        injectableName: 'Task.test',
        options: { option1: 1, option2: 2, option3: 3 },
        properties: { test: { foo: 'bar' } }
    };
    var baseTask1 = {
        friendlyName: 'base test task properties 1',
        injectableName: 'Task.Base.testProperties1',
        runJob: 'Job.test',
        requiredOptions: [],
        requiredProperties: {},
        properties: {
            test: {
                type: 'null'
            },
            fresh: {
                fruit: {
                    slices: 'sugary'
                }
            },
            fried: {
                chicken: {
                    and: {
                        waffles: 'yum'
                    }
                }
            }
        }
    };
    var baseTask2 = {
        friendlyName: 'base test task properties 2',
        injectableName: 'Task.Base.testProperties2',
        runJob: 'Job.test',
        requiredOptions: [],
        requiredProperties: {
            // test multiple levels of nesting
            'pancakes': 'syrup',
            'spam.eggs': 'monty',
            'fresh.fruit.slices': 'sugary',
            'fried.chicken.and.waffles': 'yum',
            'coffee.with.cream.and.sugar': 'wake up'
        },
        properties: {
            test: {
                type: 'null'
            }
        }
    };
    var baseTask3 = {
        friendlyName: 'base test task properties 3',
        injectableName: 'Task.Base.testProperties3',
        runJob: 'Job.test',
        requiredOptions: [],
        requiredProperties: {
            'does.not.exist': 'negative'
        },
        properties: {
            test: {
                type: 'null'
            }
        }
    };
    var testTask1 = {
        friendlyName: 'test properties task 1',
        implementsTask: 'Task.Base.testProperties1',
        injectableName: 'Task.testProperties1',
        options: {},
        properties: {
            test: {
                unit: 'properties',
            },
            pancakes: 'syrup',
            spam: {
                eggs: 'monty'
            },
            coffee: {
                'with': {
                    cream: {
                        and: {
                            sugar: 'wake up'
                        }
                    }
                }
            }
        }
    };
    var testTask2 = {
        friendlyName: 'test properties task 2',
        implementsTask: 'Task.Base.testProperties2',
        injectableName: 'Task.testProperties2',
        options: {},
        properties: {
            test: {
                foo: 'bar'
            }
        }
    };
    var testTask3 = {
        friendlyName: 'test properties task 3',
        implementsTask: 'Task.Base.testProperties3',
        injectableName: 'Task.testProperties3',
        options: {},
        properties: {
            test: {
                bar: 'baz'
            }
        }
    };
    var graphDefinitionValid = {
        injectableName: 'Graph.testPropertiesValid',
        friendlyName: 'Valid Test Graph',
        tasks: [
            {
                label: 'test-1',
                taskName: 'Task.testProperties1'
            },
            {
                label: 'test-2',
                taskName: 'Task.testProperties2',
                waitOn: {
                    'test-1': 'finished'
                }
            }
        ]
    };
    var graphDefinitionInvalid = {
        injectableName: 'Graph.testPropertiesInvalid',
        friendlyName: 'Invalid Test Graph',
        tasks: [
            {
                label: 'test-1',
                taskName: 'Task.testProperties1'
            },
            {
                label: 'test-2',
                taskName: 'Task.testProperties2',
                waitOn: {
                    'test-1': 'finished'
                }
            },
            {
                label: 'test-3',
                taskName: 'Task.testProperties3',
                waitOn: {
                    'test-2': 'finished'
                }
            }
        ]
    };

    return {
        graphDefinition: graphDefinition,
        baseTask: baseTask,
        testTask: testTask,
        baseTask1: baseTask1,
        baseTask2: baseTask2,
        baseTask3: baseTask3,
        testTask1: testTask1,
        testTask2: testTask2,
        testTask3: testTask3,
        graphDefinitionValid: graphDefinitionValid,
        graphDefinitionInvalid: graphDefinitionInvalid
    };
};
