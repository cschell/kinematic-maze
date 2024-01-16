import { MotionVisualization } from './MotionVisualization';

export class MotionVisualizationSyncer {
    syncList: MotionVisualization[] = [];

    add(mv: MotionVisualization) {
        this.syncList.push(mv);
    }

    sync() {
        Promise.all(this.syncList.map(instance => instance.ready)).then(() => {
            let firstAction: null = null;
            this.syncList.forEach(instance => {
                for (const action of Object.values(instance.actions)) {
                    if(!firstAction){
                        firstAction = action;
                    }

                    action.syncWith(firstAction);
                }
            });        
        });
    }
}
