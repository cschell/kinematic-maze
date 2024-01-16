import { MotionVisualization } from "./MotionVisualization";
import {Reactor} from "./events";

class BaseElement {
    reactor: Reactor;
    dom: HTMLElement;

    constructor(dom: HTMLElement) {
        this.reactor = new Reactor();
        this.dom = dom;
    }
}


class TimelineElement extends BaseElement {
    progressBar: HTMLDivElement;
    constructor(motionVis: MotionVisualization) {
        let dom = document.createElement("div");
        dom.classList.add("progress");
        
        super(dom);
        this.dom = dom;
        
        this.progressBar = document.createElement("div");
        this.progressBar.classList.add("progress-bar");
        
        this.dom.appendChild(this.progressBar);
        motionVis.playerDom.appendChild(this.dom);
        
        this.reactor.registerEvent('sweepRequest');

        this.dom.addEventListener('click', (event: MouseEvent) => {
            const bounds = this.dom.getBoundingClientRect();
            // Make sure to check if pageX is defined on the event, or use clientX as a fallback
            const pos = (event.pageX ?? event.clientX) - bounds.left; // Position cursor
            const requestedPosition = pos / bounds.width; // Round %
            this.reactor.dispatchEvent("sweepRequest", requestedPosition);
        });
    }

    update(progress: any): void {
        this.progressBar.style.width = progress * 100 + "%";
    }
}

class TimerElement extends BaseElement {
    update(datetime: Date): void {
        this.dom.innerHTML = datetime.toLocaleTimeString("de-DE");
    }
}

export {BaseElement, TimelineElement, TimerElement};