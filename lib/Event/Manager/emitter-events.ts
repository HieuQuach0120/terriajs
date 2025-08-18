export class EmitterEvents {
  private _events: { [eventName: string]: Array<(data: any) => void> } = {};

  constructor() {
    this._events = {};
  }

  addEventListener(eventName: string, callback: (data: any) => void): void {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    this._events[eventName].push(callback);
  }

  removeEventListener(eventName: string, callback: (data: any) => void): void {
    if (!this._events[eventName]) return;

    this._events[eventName] = this._events[eventName].filter(
      (listener) => listener !== callback
    );
  }

  emit(eventName: string, data: any): void {
    if (this._events[eventName]) {
      this._events[eventName].forEach((callback) => callback(data));
    }
  }

  clearEvent(): void {
    this._events = {};
  }

  dispose() {
    this._events = {};
  }
}
