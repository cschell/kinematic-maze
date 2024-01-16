type CallbackFunction = (eventArgs: any) => void;

class Event {
    name: string;
    callbacks: CallbackFunction[];

    constructor(name: string) {
        this.name = name;
        this.callbacks = [];
    }

    registerCallback(callback: CallbackFunction): void {
        this.callbacks.push(callback);
    }
}

class Reactor {
    events: { [eventName: string]: Event };

    constructor() {
        this.events = {};
    }

    registerEvent(eventName: string): void {
        this.events[eventName] = new Event(eventName);
    }

    dispatchEvent(eventName: string, eventArgs?: any): void {
        if (this.events[eventName]) {
            this.events[eventName].callbacks.forEach((callback) => {
                callback(eventArgs);
            });
        } else {
            // Handle the case where the event is not registered
            console.warn(`Event "${eventName}" not registered.`);
        }
    }

    addEventListener(eventName: string, callback: CallbackFunction): void {
        if (this.events[eventName]) {
            this.events[eventName].registerCallback(callback);
        } else {
            // Handle the case where the event is not registered
            console.warn(`Event "${eventName}" not registered.`);
        }
    }
}

export { Event, Reactor };
