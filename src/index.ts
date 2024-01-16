import {MotionVisualization} from './MotionVisualization';
import { MotionVisualizationSyncer } from './MotionVisualizationSyncer';
import {PlaybackController} from './PlaybackController';


function getQueryVariable(variable: string, defaultDataset: string) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        const pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return defaultDataset
}

function initializeApp() {
    const syncer = new MotionVisualizationSyncer();

    Array.from(document.getElementsByClassName('motion-player')).forEach(dom => {
        const mv = new MotionVisualization(dom as HTMLDivElement);        
        if (dom.classList.contains("motion-player-sync")) {
            syncer.add(mv);
        }
    });

    syncer.sync();
}

document.addEventListener('DOMContentLoaded', initializeApp);