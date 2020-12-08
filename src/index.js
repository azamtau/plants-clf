import 'babel-polyfill';
import * as tf from '@tensorflow/tfjs';
import { createMachine, assign, interpret } from 'xstate';

const uploadInpt  = document.querySelector('#file-input');
const predictBtn  = document.querySelector('#predict');

const assignModel = assign({
    model: (context, event) => {
        return event.data; 
    },
});

const assignFile = assign({
    imgSrc: (context, event) => {
        return event.target.files[0];
    },
});

const loadModel = async (url) => {
    return await tf.loadLayersModel(url);
};

const machine = createMachine({
    initial: 'preload',
    context: {
        modelUrl: '/model.json',
        model: undefined,
        imgSrc: '',
        class: '',
    },
    states: {
        preload: {
            invoke: {
                id: 'getModel',
                src: (context, event) => {
                    return loadModel(context.modelUrl);
                },
                // onDone: {
                //     target: 'idle',
                //     actions: assignModel, 
                // },
                //onError: 'rejected',
            },
            on: {
                'done.invoke.getModel': {
                    actions: assignModel, 
                    target: 'idle',
                },
            },
        },
        idle: {
            on: {
                change: {
                    actions: assignFile,
                    target: 'staged',
                },
            },
        },
        staged: {
            on: {
                click: {
                    // action: ,
                    target: 'pocessing',
                    cond: 'hasFile',
                }
            },
        },
        pocessing: {
            // TBD: invoke promise
        },
        final: {
            type: 'final',
        },
    },
},
{
    guards: {
        hasModel: (context, event) => {
            return !!context.model;
        },
        hasFile: (context, event) => {
            return context.imgSrc !== null && context.imSrc !== "" && !!context.imgSrc; //&& event.target.files.length !== 0; 
        },
    },
});

const service = interpret(machine);
service.onTransition((state) => {
    // TBD: data-state 
    // elContent.dataset.state = state.toStrings().join(' ');
    console.log(state.value);
    console.log(state.context.model);

    if (state.changed) {
        console.log("STATE CHANGED"); 
        
    }
});
service.start();

uploadInpt.addEventListener('change', (e) => {
    service.send(e);
}, false);

predictBtn.addEventListener('click', (e) => {
    service.send(e);
}, false);
