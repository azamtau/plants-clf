import 'babel-polyfill';
import * as tf from '@tensorflow/tfjs';
import { createMachine, assign, interpret } from 'xstate';

const container   = document.querySelector('#container');
const contentEl   = document.querySelector('.content');

const uploadInpt  = document.querySelector('#file-input');
const predictBtn  = document.querySelector('#predict');
const retryBtn    = document.querySelector('#retry');
const cnv         = document.querySelector('#canvas');
const predictionP = document.querySelector('#prediction');
const loader      = document.querySelector('#loader');

const assignModel = assign({
    model: (context, event) => {
        return event.data; 
    },
});

const assignPrediction = assign({
    class: (context, event) => {
        return event.data;
    },
});

const assignFile = assign({
    imgSrc: (context, event) => {
        return event.target.files ? event.target.files[0] : undefined;
    },
});

const assignCnvImg = assign({
    cnvImg: (context, event) => {
        // TBD: add isFile check
        let img = document.createElement("img");
        img.src = window.URL.createObjectURL(context.imgSrc);
        //container.style.backgroundImage = `url('${img.src}')`;
        contentEl.style.backgroundImage = `url('${img.src}')`;
        img.onload = function() {
            window.URL.revokeObjectURL(this.src);
        }

        return img;
    },
});

const resetCntx = assign({
    cnvImg: undefined,
    imgSrc: undefined,
    class: '',
});

const showLoader = () => {
    loader.removeAttribute('hidden');
};

const hideLoader = () => {
    loader.setAttribute('hidden', '');
};

const loadModel = async (url) => {
    return await tf.loadLayersModel(url);
};
 
const predict = async (model, img, labels) => {
    let tensorImg = tf.browser.fromPixels(img).resizeNearestNeighbor([60, 40]).toFloat().expandDims();
    let prediction = await model.predict(tensorImg).data();
    
    return labels[prediction.indexOf(Math.max(...prediction))];
};

const machine = createMachine({
    initial: 'preload',
    context: {
        modelUrl: '/model.json',
        labels: ['cat', 'dog', 'beaver'],
        model: undefined,
        cnvImg: undefined,
        imgSrc: undefined,
        class: '',
    },
    states: {
        preload: {
            entry: showLoader,
            exit: hideLoader,
            invoke: {
                id: 'getModel',
                src: (context, event) => {
                    return loadModel(context.modelUrl);
                },
                onDone: {
                    target: 'idle',
                    actions: [assignModel], 
                },
                //onError: 'myCodeIsBulletproof',
            },
        },
        idle: {
            on: {
                change: {
                    actions: [assignFile, assignCnvImg],
                    target: 'staged',
                    cond: 'hasModel',
                },
            },
        },
        staged: {
            on: {
                click: {
                    target: 'pocessing',
                    cond: 'hasFile',
                }
            },
        },
        pocessing: {
            entry: showLoader,
            exit: hideLoader,
            invoke: {
                id: 'predict',
                src: (context, event) => {
                    return predict(context.model, context.cnvImg, context.labels);
                },
                onDone: {
                    target: 'finished',
                    actions: assignPrediction, 
                },
                //onError: 'myCodeIsBulletproof',
            },
        },
        finished: {
            // type: 'final',
            exit: (context, event) => {
                contentEl.style.backgroundImage = 'none';
                uploadInpt.value = '';  
                predictionP.innerText = '';
            },
            on: {
                'retry.click': {
                    target: 'idle',
                    actions: resetCntx,
                }
            },
        },
    },
},
{
    guards: {
        hasModel: (context, event) => {
            return !!context.model;
        },
        hasFile: (context, event) => {
            return context.imgSrc !== null && context.imSrc !== "" && !!context.imgSrc; 
        },
    },
});

const service = interpret(machine);
service.onTransition((state) => {
    container.dataset.state = state.toStrings().join(' ');
    
    console.log(state.value);

    if (state.changed) {
        if (state.value === 'finished') {
            console.log(`Predicted class: ${state.context.class}`);
            predictionP.innerText = `Predicted class: ${state.context.class}`;
        }
        if (state.value === 'finished') {
        }
        console.log(state.context);
    }
});
service.start();

uploadInpt.addEventListener('change', (e) => {
    service.send(e);
}, false);

predictBtn.addEventListener('click', (e) => {
    service.send(e);
}, false);

retryBtn.addEventListener('click', (e) => {
    service.send({ type: 'retry.click', target: e.target});
}, false);